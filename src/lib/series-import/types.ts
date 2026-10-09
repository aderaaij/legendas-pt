/**
 * Shapes for a series import (RTP or RTVE; `extraction_jobs.job_type` is
 * 'rtp_series' for both — the name predates RTVE). The import "plan" and live
 * per-episode status are stored inside `extraction_jobs.results` (freeform
 * jsonb), so no DB migration is needed. Shared by the start route, the worker
 * and the progress UI.
 */
import type { Provider } from "@/lib/llm/types";
import type { SeriesSourceId } from "@/lib/sources/meta";

/** Sub-stages emitted while processing a single episode (for "what it's doing"). */
export type EpisodeStep =
  | "scraping"
  | "extracting"
  | "saving"
  | "essentials"
  | "reviewing";

/** Terminal outcomes plus the in-flight sub-stages and the initial pending state. */
export type EpisodeStatus =
  | "pending"
  | EpisodeStep
  | "success"
  | "already_exists"
  | "no_subtitle"
  | "extraction_failed"
  | "error";

export interface PlanEpisode {
  episodeNumber: number;
  /** The source's episode id (named before RTVE support; kept for stored plans). */
  rtpId: string;
  title: string;
  url: string;
  airDate?: string;
}

export interface ImportPlan {
  /** Where the series is imported from. Absent on plans created before RTVE. */
  source?: SeriesSourceId;
  showId: string | null;
  season: number;
  seriesTitle: string;
  seriesUrl: string;
  saveToDatabase: boolean;
  forceReExtraction: boolean;
  provider: Provider | null;
  model: string | null;
  episodes: PlanEpisode[];
}

export interface EpisodeState {
  status: EpisodeStatus;
  episodeNumber: number;
  title: string;
  phraseCount?: number;
  extractionId?: string;
  error?: string;
  /** Essentials picked after a successful extraction (a non-fatal extra step). */
  essentialsCount?: number;
  essentialsError?: string;
  /** Translation-review suggestions awaiting an admin (another non-fatal step). */
  reviewFlagCount?: number;
  reviewError?: string;
  updatedAt: string;
}

export interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  alreadyExists: number;
  noSubtitle: number;
}

export interface ImportResults {
  plan: ImportPlan;
  /** Live per-episode state, keyed by episodeNumber (string keys in JSON). */
  episodes: Record<string, EpisodeState>;
  summary: ImportSummary;
}

/** Episode statuses that are final (won't be re-processed on resume). */
export const TERMINAL_STATUSES: ReadonlySet<EpisodeStatus> = new Set([
  "success",
  "already_exists",
  "no_subtitle",
  "extraction_failed",
  "error",
]);
