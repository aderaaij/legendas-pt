/**
 * Run a `phrase_review` job: for each planned extraction, load its stored
 * subtitle and run the translation review, writing per-extraction progress to
 * `extraction_jobs.results`. Suggestions land as `pending` on the episode edit
 * page; earlier accept/reject decisions are kept.
 *
 * Resumable and cancellable like the essentials backfill: finished extractions
 * are skipped on re-entry, and cancellation/shutdown are checked between them.
 * A missing API key or unknown provider fails the whole job at once.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateExtractionJob } from "@/lib/db/extraction-jobs";
import { getReviewSource } from "@/lib/db/phrase-review";
import { reviewExtraction } from "@/lib/phrase-review/review-extraction";
import { MissingApiKeyError, UnknownProviderError } from "@/lib/llm/providers";
import type { ExtractionJob } from "@/types/database";
import type {
  PhraseReviewResults,
  ReviewItemState,
} from "@/lib/phrase-review/types";
import type { ProcessJobHooks } from "./process-series-import";
import { sleep, backoffDelay, progressFields, summarizeUnits } from "./util";

type Results = ExtractionJob["results"];

export async function processPhraseReviewJob(
  supabase: SupabaseClient,
  job: ExtractionJob,
  hooks: ProcessJobHooks
): Promise<void> {
  const { log, isCancelled, shouldStop } = hooks;
  const results = job.results as unknown as PhraseReviewResults | undefined;

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
    return failJob("Job has no review plan");
  }

  const { plan } = results;
  const extractions: Record<string, ReviewItemState> = {
    ...(results.extractions ?? {}),
  };
  const total = plan.extractionIds.length;

  for (const extractionId of plan.extractionIds) {
    if (shouldStop()) {
      log(`job ${job.id}: shutting down — left resumable`);
      return;
    }
    if (await isCancelled()) {
      log(`job ${job.id}: cancelled`);
      return;
    }
    if (extractions[extractionId]) continue; // finished on a previous run

    const source = await getReviewSource(supabase, extractionId);
    const label = source?.label ?? extractionId;

    let state: ReviewItemState;
    if (!source) {
      state = { status: "skipped", label, error: "Extraction no longer exists" };
    } else if (!source.content) {
      state = { status: "no_subtitle", label };
    } else {
      await updateExtractionJob(
        job.id,
        { current_episode: `${label} — Reviewing translations` },
        supabase
      );
      state = { status: "failed", label };
      for (let attempt = 0; ; attempt++) {
        try {
          const count = await reviewExtraction(supabase, {
            extractionId,
            language: source.language,
            content: source.content,
            filename: source.filename,
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

    extractions[extractionId] = state;
    const summary = summarizeUnits(extractions, total);
    await updateExtractionJob(
      job.id,
      {
        ...progressFields(summary),
        current_episode: label,
        results: { ...results, extractions, summary } as unknown as Results,
      },
      supabase
    );
    log(
      `job ${job.id}: ${label} → ${state.status}${
        state.count != null ? ` (${state.count} to check)` : ""
      }${state.error ? ` — ${state.error}` : ""}`
    );
  }

  const summary = summarizeUnits(extractions, total);
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
      results: { ...results, extractions, summary } as unknown as Results,
      completed_at: new Date().toISOString(),
    },
    supabase
  );
  log(
    `job ${job.id}: ${finalStatus} (${completed_episodes}/${total} ok, ${failed_episodes} failed)`
  );
}
