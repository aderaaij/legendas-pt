import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { PhraseExtractionService } from "@/lib/supabase";
import type { ExtractionJob } from "@/lib/supabase";
import { createServiceClient, requireAdmin } from "@/lib/supabase-admin";
import { fetchAll } from "@/lib/db/fetch-all";
import {
  EPISODE_EMBED,
  episodeLabel,
  type EpisodeEmbed,
} from "@/lib/db/phrase-review";
import type {
  PhraseReviewPlan,
  PhraseReviewResults,
  PhraseReviewScope,
} from "@/lib/phrase-review/types";

// Enqueue only — pick the extractions and create a job. No LLM work here.
export const maxDuration = 60;

interface StartBody {
  /** episode: (re-)review one episode; unreviewed: every episode never reviewed. */
  scope?: PhraseReviewScope;
  episodeId?: string;
  /** Only count the episodes; don't enqueue. */
  dryRun?: boolean;
}

interface ExtractionRow {
  id: string;
  episode: EpisodeEmbed;
}

/** Episode extractions in scope that have a stored subtitle to review against. */
async function selectExtractions(
  supabase: SupabaseClient,
  scope: PhraseReviewScope,
  episodeId?: string
): Promise<ExtractionRow[]> {
  const rows = await fetchAll<ExtractionRow>((from, to) => {
    let query = supabase
      .from("phrase_extractions")
      .select(`id, ${EPISODE_EMBED}`)
      .not("episode_id", "is", null)
      .not("content_full", "is", null);
    query =
      scope === "episode"
        ? query.eq("episode_id", episodeId!)
        : query.is("reviewed_at", null);
    return query.order("id").range(from, to) as unknown as PromiseLike<{
      data: ExtractionRow[] | null;
      error: { message: string } | null;
    }>;
  });
  return rows.sort((a, b) =>
    episodeLabel(a.episode).localeCompare(episodeLabel(b.episode))
  );
}

export async function POST(request: NextRequest) {
  try {
    const body: StartBody = await request.json();
    const scope: PhraseReviewScope = body.scope ?? "unreviewed";

    const auth = await requireAdmin(request.headers.get("authorization"));
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error.message },
        { status: auth.error.status }
      );
    }

    if (scope !== "episode" && scope !== "unreviewed") {
      return NextResponse.json({ error: `Unknown scope: ${scope}` }, { status: 400 });
    }
    if (scope === "episode" && !body.episodeId) {
      return NextResponse.json({ error: "episodeId is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const extractions = await selectExtractions(supabase, scope, body.episodeId);

    if (body.dryRun || extractions.length === 0) {
      return NextResponse.json({ jobId: null, count: extractions.length });
    }

    // One bulk review at a time; a single-episode review can run alongside.
    if (scope === "unreviewed") {
      const { data: active, error: activeError } = await supabase
        .from("extraction_jobs")
        .select("id, results")
        .eq("job_type", "phrase_review")
        .in("status", ["queued", "pending", "running"]);
      if (activeError) throw new Error(activeError.message);
      const bulkActive = (active ?? []).some(
        (job) =>
          (job.results as PhraseReviewResults | null)?.plan?.scope === "unreviewed"
      );
      if (bulkActive) {
        return NextResponse.json(
          { error: "A translation review of all episodes is already running" },
          { status: 409 }
        );
      }
    }

    const title =
      scope === "episode"
        ? `Translation review · ${episodeLabel(extractions[0].episode)}`
        : "Translation review · all unreviewed";
    const job = await PhraseExtractionService.createExtractionJob(
      auth.user.id,
      "phrase_review",
      title,
      undefined,
      extractions.length,
      supabase
    );

    const plan: PhraseReviewPlan = {
      scope,
      extractionIds: extractions.map((extraction) => extraction.id),
    };
    const results: PhraseReviewResults = {
      plan,
      extractions: {},
      summary: {
        total: extractions.length,
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

    return NextResponse.json({ jobId: job.id, count: extractions.length });
  } catch (error) {
    console.error("phrase-review/start error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
