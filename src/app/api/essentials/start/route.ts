import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { PhraseExtractionService } from "@/lib/supabase";
import type { ExtractionJob } from "@/lib/supabase";
import { createServiceClient, requireAdmin } from "@/lib/supabase-admin";
import { isProvider, type Provider } from "@/lib/llm/types";
import {
  isTargetLanguage,
  toTargetLanguage,
  LANGUAGES,
  type TargetLanguage,
} from "@/lib/i18n/languages";
import type {
  EssentialsBackfillPlan,
  EssentialsBackfillResults,
} from "@/lib/essentials/types";

// Enqueue only — pick the episodes and create a job. No LLM work here.
export const maxDuration = 60;

type Scope = "missing" | "show" | "episode";

interface StartBody {
  /** missing: every episode without essentials; show: one show; episode: one episode. */
  scope?: Scope;
  showId?: string;
  episodeId?: string;
  /** Limit `missing` to one target language. */
  language?: string;
  /** Regenerate even when an episode already has essentials (default: true for
   *  a single episode, false otherwise). */
  force?: boolean;
  /** Only count the episodes; don't enqueue. */
  dryRun?: boolean;
  provider?: string | null;
  model?: string | null;
}

interface EpisodeRow {
  id: string;
  show_id: string;
  season: number | null;
  episode_number: number | null;
  essentials_generated_at: string | null;
  show: { name: string; language: string | null } | null;
}

const PAGE_SIZE = 1000; // PostgREST's default max rows per request

/** Every row of a query, paging past the per-request row cap. */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/** Episodes in scope that have a stored subtitle to pick essentials from. */
async function selectEpisodes(
  supabase: SupabaseClient,
  { scope, showId, episodeId, language, force }: {
    scope: Scope;
    showId?: string;
    episodeId?: string;
    language?: TargetLanguage;
    force: boolean;
  }
): Promise<EpisodeRow[]> {
  const episodes = await fetchAll<EpisodeRow>((from, to) => {
    let query = supabase
      .from("episodes")
      .select(
        "id, show_id, season, episode_number, essentials_generated_at, show:shows(name, language)"
      );
    if (scope === "episode") query = query.eq("id", episodeId!);
    if (scope === "show") query = query.eq("show_id", showId!);
    if (!force) query = query.is("essentials_generated_at", null);
    return query.order("id").range(from, to) as unknown as PromiseLike<{
      data: EpisodeRow[] | null;
      error: { message: string } | null;
    }>;
  });

  const inLanguage = episodes.filter(
    (ep) => !language || toTargetLanguage(ep.show?.language) === language
  );
  if (inLanguage.length === 0) return [];

  // Which of them have an extraction with stored subtitle content.
  const withSource = new Set(
    (
      await fetchAll<{ episode_id: string }>((from, to) => {
        let query = supabase
          .from("phrase_extractions")
          .select("episode_id")
          .not("episode_id", "is", null)
          .not("content_full", "is", null);
        if (scope !== "missing") {
          query = query.in("episode_id", inLanguage.map((ep) => ep.id));
        }
        return query.order("id").range(from, to);
      })
    ).map((row) => row.episode_id)
  );

  return inLanguage
    .filter((ep) => withSource.has(ep.id))
    .sort(
      (a, b) =>
        (a.show?.name ?? "").localeCompare(b.show?.name ?? "") ||
        (a.season ?? 0) - (b.season ?? 0) ||
        (a.episode_number ?? 0) - (b.episode_number ?? 0)
    );
}

function jobTitle(scope: Scope, episodes: EpisodeRow[], language?: TargetLanguage) {
  const first = episodes[0];
  const pad = (n: number | null) => String(n ?? 0).padStart(2, "0");
  switch (scope) {
    case "episode":
      return `Essentials · ${first.show?.name ?? "Episode"} S${pad(first.season)}E${pad(first.episode_number)}`;
    case "show":
      return `Essentials · ${first.show?.name ?? "Show"}`;
    case "missing":
      return `Essentials · all missing${language ? ` (${LANGUAGES[language].tag})` : ""}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: StartBody = await request.json();
    const scope: Scope = body.scope ?? "missing";
    const force = body.force ?? scope === "episode";
    const provider = body.provider ?? null;

    const auth = await requireAdmin(request.headers.get("authorization"));
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error.message },
        { status: auth.error.status }
      );
    }

    if (!["missing", "show", "episode"].includes(scope)) {
      return NextResponse.json({ error: `Unknown scope: ${scope}` }, { status: 400 });
    }
    if (scope === "episode" && !body.episodeId) {
      return NextResponse.json({ error: "episodeId is required" }, { status: 400 });
    }
    if (scope === "show" && !body.showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }
    if (body.language && !isTargetLanguage(body.language)) {
      return NextResponse.json(
        { error: `Unknown language: ${body.language}` },
        { status: 400 }
      );
    }
    if (provider && !isProvider(provider)) {
      return NextResponse.json(
        { error: `Unknown LLM provider: ${provider}` },
        { status: 400 }
      );
    }
    const language = body.language as TargetLanguage | undefined;

    const supabase = createServiceClient();
    const episodes = await selectEpisodes(supabase, {
      scope,
      showId: body.showId,
      episodeId: body.episodeId,
      language,
      force,
    });

    if (body.dryRun || episodes.length === 0) {
      return NextResponse.json({ jobId: null, count: episodes.length });
    }

    // One bulk backfill at a time; a single-episode regenerate can run alongside.
    if (scope !== "episode") {
      const { data: active, error: activeError } = await supabase
        .from("extraction_jobs")
        .select("id, results")
        .eq("job_type", "essentials_backfill")
        .in("status", ["queued", "pending", "running"]);
      if (activeError) throw new Error(activeError.message);
      const bulkActive = (active ?? []).some(
        (job) =>
          (job.results as EssentialsBackfillResults | null)?.plan?.episodeIds
            ?.length !== 1
      );
      if (bulkActive) {
        return NextResponse.json(
          { error: "An essentials backfill is already running" },
          { status: 409 }
        );
      }
    }

    const job = await PhraseExtractionService.createExtractionJob(
      auth.user.id,
      "essentials_backfill",
      jobTitle(scope, episodes, language),
      undefined,
      episodes.length,
      supabase
    );

    const plan: EssentialsBackfillPlan = {
      episodeIds: episodes.map((ep) => ep.id),
      force,
      provider: (provider as Provider | null) ?? null,
      model: body.model ?? null,
    };
    const results: EssentialsBackfillResults = {
      plan,
      episodes: {},
      summary: {
        total: episodes.length,
        successful: 0,
        failed: 0,
        alreadyExists: 0,
        noSubtitle: 0,
      },
    };

    // Enqueue: mark 'queued' and return. The worker claims it and does the work.
    await PhraseExtractionService.updateExtractionJob(
      job.id,
      {
        status: "queued",
        progress: 0,
        results: results as unknown as ExtractionJob["results"],
      },
      supabase
    );

    return NextResponse.json({ jobId: job.id, count: episodes.length });
  } catch (error) {
    console.error("essentials/start error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
