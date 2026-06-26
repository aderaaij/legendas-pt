/**
 * Run a full `rtp_series` job to completion: for each non-terminal plan episode,
 * scrape → extract → persist, writing per-episode progress to
 * `extraction_jobs.results` exactly as the old `/api/rtp-import/step` route did —
 * just looped in one persistent process instead of one HTTP request per episode.
 *
 * Resumable and cancellable: terminal episodes are skipped on re-entry (dedup
 * makes re-processing safe), and both cancellation and graceful shutdown are
 * checked between episodes so an interrupted job stays resumable.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateExtractionJob } from "@/lib/db/extraction-jobs";
import { processEpisode } from "@/lib/rtp-import/process-episode";
import type { ExtractionJob } from "@/types/database";
import {
  TERMINAL_STATUSES,
  type EpisodeState,
  type EpisodeStep,
  type ImportResults,
  type ImportSummary,
} from "@/lib/rtp-import/types";
import { sleep, backoffDelay } from "./util";

const STEP_LABELS: Record<EpisodeStep, string> = {
  scraping: "Scraping subtitle",
  extracting: "Extracting phrases",
  saving: "Saving",
};

function computeSummary(
  episodes: Record<string, EpisodeState>,
  total: number
): ImportSummary {
  const vals = Object.values(episodes);
  return {
    total,
    successful: vals.filter((e) => e.status === "success").length,
    failed: vals.filter(
      (e) => e.status === "error" || e.status === "extraction_failed"
    ).length,
    alreadyExists: vals.filter((e) => e.status === "already_exists").length,
    noSubtitle: vals.filter((e) => e.status === "no_subtitle").length,
  };
}

type Results = ExtractionJob["results"];

export interface ProcessJobHooks {
  log: (msg: string) => void;
  /** True if the job was cancelled (checked between episodes). */
  isCancelled: () => Promise<boolean>;
  /** True if the worker is shutting down (checkpoint and leave the job resumable). */
  shouldStop: () => boolean;
  /** Max retries for a transient per-unit failure. */
  maxRetries: number;
  /** Base backoff (ms) between unit retries. */
  retryBaseMs: number;
}

/** Outcomes worth retrying — transient (network/LLM/DB), not "no subtitle" etc. */
function isRetryable(status: string): boolean {
  return status === "error" || status === "extraction_failed";
}

export async function processRtpSeriesJob(
  supabase: SupabaseClient,
  job: ExtractionJob,
  hooks: ProcessJobHooks
): Promise<void> {
  const { log, isCancelled, shouldStop } = hooks;
  const results = job.results as unknown as ImportResults | undefined;

  if (!results?.plan) {
    await updateExtractionJob(
      job.id,
      {
        status: "failed",
        error_message: "Job has no import plan",
        completed_at: new Date().toISOString(),
      },
      supabase
    );
    log(`job ${job.id}: no import plan — marked failed`);
    return;
  }

  const { plan } = results;
  const episodes: Record<string, EpisodeState> = { ...(results.episodes ?? {}) };
  const total = plan.episodes.length;

  for (const ep of plan.episodes) {
    if (shouldStop()) {
      log(`job ${job.id}: shutting down — left resumable`);
      return;
    }
    if (await isCancelled()) {
      log(`job ${job.id}: cancelled`);
      return;
    }

    const key = String(ep.episodeNumber);
    const current = episodes[key]?.status ?? "pending";
    if (TERMINAL_STATUSES.has(current)) {
      continue; // already done on a previous run
    }

    // Persist an in-flight sub-stage so polling shows "what it's doing".
    const writeStep = async (step: EpisodeStep) => {
      episodes[key] = {
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        status: step,
        updatedAt: new Date().toISOString(),
      };
      await updateExtractionJob(
        job.id,
        {
          current_episode: `Ep. ${ep.episodeNumber}: ${ep.title} — ${STEP_LABELS[step]}`,
          results: { ...results, episodes } as unknown as Results,
        },
        supabase
      );
    };

    const runEpisode = () =>
      processEpisode({
        supabase,
        episode: ep,
        showId: plan.showId,
        season: plan.season,
        seriesTitle: plan.seriesTitle,
        saveToDatabase: plan.saveToDatabase,
        forceReExtraction: plan.forceReExtraction,
        provider: plan.provider,
        model: plan.model,
        onStep: writeStep,
      });

    // Retry a transiently-failing episode with backoff, then accept the failure
    // and move on (the job still completes; this unit is marked failed).
    let outcome = await runEpisode();
    for (
      let attempt = 0;
      isRetryable(outcome.status) &&
      attempt < hooks.maxRetries &&
      !shouldStop() &&
      !(await isCancelled());
      attempt++
    ) {
      const delay = backoffDelay(attempt, hooks.retryBaseMs);
      log(
        `job ${job.id}: ep ${ep.episodeNumber} ${outcome.status} — retry ${
          attempt + 1
        }/${hooks.maxRetries} in ${delay}ms`
      );
      await sleep(delay);
      outcome = await runEpisode();
    }

    episodes[key] = {
      episodeNumber: ep.episodeNumber,
      title: ep.title,
      status: outcome.status,
      phraseCount: outcome.phraseCount,
      extractionId: outcome.extractionId,
      error: outcome.error,
      updatedAt: new Date().toISOString(),
    };

    const summary = computeSummary(episodes, total);
    const completed = summary.successful + summary.alreadyExists;
    const failed = summary.failed + summary.noSubtitle;
    const progress = Math.round(((completed + failed) / total) * 100);

    await updateExtractionJob(
      job.id,
      {
        progress,
        completed_episodes: completed,
        failed_episodes: failed,
        current_episode: `Ep. ${ep.episodeNumber}: ${ep.title}`,
        results: { ...results, episodes, summary } as unknown as Results,
      },
      supabase
    );
    log(`job ${job.id}: ep ${ep.episodeNumber} → ${outcome.status}`);
  }

  // Finalize (mirror the step route's completion logic).
  const summary = computeSummary(episodes, total);
  const completed = summary.successful + summary.alreadyExists;
  const failed = summary.failed + summary.noSubtitle;
  const finalStatus = failed === 0 || completed > 0 ? "completed" : "failed";

  await updateExtractionJob(
    job.id,
    {
      status: finalStatus,
      progress: 100,
      completed_episodes: completed,
      failed_episodes: failed,
      results: { ...results, episodes, summary } as unknown as Results,
      completed_at: new Date().toISOString(),
    },
    supabase
  );
  log(`job ${job.id}: ${finalStatus} (${completed}/${total} ok, ${failed} failed)`);
}
