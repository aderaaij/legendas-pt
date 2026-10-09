/**
 * Shapes for a `phrase_review` job: run the translation review for a list of
 * extractions from their stored subtitle. Like the other job types, the plan
 * and live per-extraction state live in `extraction_jobs.results`. Shared by
 * the start route, the worker and the admin UI.
 */
import type { ImportSummary } from "@/lib/series-import/types";

/** episode: one episode on request; unreviewed: every episode never reviewed. */
export type PhraseReviewScope = "episode" | "unreviewed";

export interface PhraseReviewPlan {
  scope: PhraseReviewScope;
  /** Extractions to review, in order. */
  extractionIds: string[];
}

export interface ReviewItemState {
  /** `skipped` = the extraction no longer exists. */
  status: "success" | "skipped" | "no_subtitle" | "failed";
  label?: string;
  /** Suggestions now pending for the extraction. */
  count?: number;
  error?: string;
}

export interface PhraseReviewResults {
  plan: PhraseReviewPlan;
  /** Finished extractions, keyed by extraction id (absent = not processed yet). */
  extractions: Record<string, ReviewItemState>;
  /** Same keys as a series import so `JobStatusBanner` renders it as-is. */
  summary: ImportSummary;
}
