/**
 * Shapes for an `essentials_backfill` job: (re)generate essentials for a list
 * of already-extracted episodes from their stored subtitle. Like the other job
 * types, the plan and live per-episode state live in `extraction_jobs.results`.
 * Shared by the start route, the worker and the admin UI.
 */
import type { Provider } from "@/lib/llm/types";
import type { ImportSummary } from "@/lib/series-import/types";

export interface EssentialsBackfillPlan {
  /** Episodes to process, in order. */
  episodeIds: string[];
  /** Regenerate even when an episode already has essentials. */
  force: boolean;
  /** Per-job LLM override; falls back to env/default. */
  provider: Provider | null;
  model: string | null;
}

type BackfillEpisodeStatus =
  | "success"
  /** Already had essentials (and not forcing), or the episode is gone. */
  | "skipped"
  | "no_subtitle"
  | "failed";

export interface BackfillEpisodeState {
  status: BackfillEpisodeStatus;
  label?: string;
  count?: number;
  error?: string;
}

export interface EssentialsBackfillResults {
  plan: EssentialsBackfillPlan;
  /** Finished episodes, keyed by episode id (absent = not processed yet). */
  episodes: Record<string, BackfillEpisodeState>;
  /** Same keys as a series import so `JobStatusBanner` renders it as-is:
   *  `alreadyExists` counts skipped episodes. */
  summary: ImportSummary;
}
