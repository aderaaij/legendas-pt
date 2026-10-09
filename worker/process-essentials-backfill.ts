/**
 * Run an `essentials_backfill` job: for each planned episode, load its stored
 * subtitle and (re)generate its essentials, writing per-episode progress to
 * `extraction_jobs.results`.
 *
 * Resumable and cancellable like a series import: finished episodes are
 * skipped on re-entry, and cancellation/shutdown are checked between episodes.
 * A missing API key or unknown provider fails the whole job at once (every
 * episode would fail the same way).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateExtractionJob } from "@/lib/db/extraction-jobs";
import { loadEssentialsSource } from "@/lib/db/essentials";
import { generateEpisodeEssentials } from "@/lib/essentials/generate";
import { MissingApiKeyError, UnknownProviderError } from "@/lib/llm/providers";
import type { ExtractionJob } from "@/types/database";
import type {
  BackfillEpisodeState,
  EssentialsBackfillResults,
} from "@/lib/essentials/types";
import type { ImportSummary } from "@/lib/series-import/types";
import type { ProcessJobHooks } from "./process-series-import";
import { sleep, backoffDelay } from "./util";

type Results = ExtractionJob["results"];

function computeSummary(
  episodes: Record<string, BackfillEpisodeState>,
  total: number
): ImportSummary {
  const vals = Object.values(episodes);
  const count = (status: BackfillEpisodeState["status"]) =>
    vals.filter((e) => e.status === status).length;
  return {
    total,
    successful: count("success"),
    failed: count("failed"),
    alreadyExists: count("skipped"),
    noSubtitle: count("no_subtitle"),
  };
}

function progressFields(summary: ImportSummary) {
  const completed = summary.successful + summary.alreadyExists;
  const failed = summary.failed + summary.noSubtitle;
  return {
    completed_episodes: completed,
    failed_episodes: failed,
    progress: summary.total
      ? Math.round(((completed + failed) / summary.total) * 100)
      : 100,
  };
}

interface EpisodeRow {
  season: number | null;
  episode_number: number | null;
  essentials_generated_at: string | null;
  show: { name: string } | null;
}

function episodeLabel(row: EpisodeRow): string {
  const pad = (n: number | null) => String(n ?? 0).padStart(2, "0");
  return `${row.show?.name ?? "Unknown show"} S${pad(row.season)}E${pad(row.episode_number)}`;
}

export async function processEssentialsBackfillJob(
  supabase: SupabaseClient,
  job: ExtractionJob,
  hooks: ProcessJobHooks
): Promise<void> {
  const { log, isCancelled, shouldStop } = hooks;
  const results = job.results as unknown as EssentialsBackfillResults | undefined;

  const failJob = async (message: string) => {
    await updateExtractionJob(
      job.id,
      {
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      },
      supabase
    );
    log(`job ${job.id}: ${message} — marked failed`);
  };

  if (!results?.plan) {
    return failJob("Job has no essentials plan");
  }

  const { plan } = results;
  const episodes: Record<string, BackfillEpisodeState> = {
    ...(results.episodes ?? {}),
  };
  const total = plan.episodeIds.length;

  for (const episodeId of plan.episodeIds) {
    if (shouldStop()) {
      log(`job ${job.id}: shutting down — left resumable`);
      return;
    }
    if (await isCancelled()) {
      log(`job ${job.id}: cancelled`);
      return;
    }
    if (episodes[episodeId]) continue; // finished on a previous run

    const { data: row, error: rowError } = await supabase
      .from("episodes")
      .select("season, episode_number, essentials_generated_at, show:shows(name)")
      .eq("id", episodeId)
      .maybeSingle();
    if (rowError) throw new Error(`Failed to load episode: ${rowError.message}`);
    const episode = row as unknown as EpisodeRow | null;
    const label = episode ? episodeLabel(episode) : episodeId;

    let state: BackfillEpisodeState;
    if (!episode) {
      state = { status: "skipped", label, error: "Episode no longer exists" };
    } else if (!plan.force && episode.essentials_generated_at) {
      state = { status: "skipped", label };
    } else {
      await updateExtractionJob(
        job.id,
        { current_episode: `${label} — Picking essentials` },
        supabase
      );
      const source = await loadEssentialsSource(supabase, episodeId);
      if (!source) {
        state = { status: "no_subtitle", label };
      } else {
        state = { status: "failed", label };
        for (let attempt = 0; ; attempt++) {
          try {
            const count = await generateEpisodeEssentials(supabase, {
              episodeId,
              language: source.language,
              content: source.content,
              filename: source.filename,
              provider: plan.provider,
              model: plan.model,
            });
            state = { status: "success", label, count };
            break;
          } catch (err) {
            if (
              err instanceof MissingApiKeyError ||
              err instanceof UnknownProviderError
            ) {
              return failJob(err.message);
            }
            const message = err instanceof Error ? err.message : String(err);
            if (
              attempt >= hooks.maxRetries ||
              shouldStop() ||
              (await isCancelled())
            ) {
              state = { status: "failed", label, error: message };
              break;
            }
            const delay = backoffDelay(attempt, hooks.retryBaseMs);
            log(
              `job ${job.id}: ${label} failed — retry ${attempt + 1}/${
                hooks.maxRetries
              } in ${delay}ms (${message})`
            );
            await sleep(delay);
          }
        }
      }
    }

    episodes[episodeId] = state;
    const summary = computeSummary(episodes, total);
    await updateExtractionJob(
      job.id,
      {
        ...progressFields(summary),
        current_episode: label,
        results: { ...results, episodes, summary } as unknown as Results,
      },
      supabase
    );
    log(
      `job ${job.id}: ${label} → ${state.status}${
        state.count != null ? ` (${state.count})` : ""
      }${state.error ? ` — ${state.error}` : ""}`
    );
  }

  const summary = computeSummary(episodes, total);
  const { completed_episodes, failed_episodes } = progressFields(summary);
  const finalStatus =
    failed_episodes === 0 || completed_episodes > 0 ? "completed" : "failed";
  await updateExtractionJob(
    job.id,
    {
      status: finalStatus,
      progress: 100,
      completed_episodes,
      failed_episodes,
      current_episode: null as unknown as undefined,
      results: { ...results, episodes, summary } as unknown as Results,
      completed_at: new Date().toISOString(),
    },
    supabase
  );
  log(
    `job ${job.id}: ${finalStatus} (${completed_episodes}/${total} ok, ${failed_episodes} failed)`
  );
}
