/**
 * Shapes for a `manual_upload` extraction job. Like `rtp_series`, the plan +
 * live status live inside `extraction_jobs.results` (jsonb), so no schema change
 * is needed. The single "unit" is the uploaded file (there's no episode list to
 * iterate), so results carry one status rather than an episodes map.
 *
 * The browser sends the subtitle CONTENT to the enqueue endpoint, which embeds
 * it in the plan; the worker reads it, extracts, and persists (no scraper).
 */
import type { Provider } from "@/lib/llm/types";
import type { EpisodeStatus } from "@/lib/rtp-import/types";

export interface ManualUploadPlan {
  /** The uploaded subtitle text (small — jsonb is fine). */
  content: string;
  filename?: string;
  fileType?: "vtt" | "srt" | "txt";
  language: string;
  /** Source tag for the show (e.g. "rtp", "uploaded_file"). */
  source: string;
  /** Target show: pre-resolved id if known, else resolved by name in the worker. */
  showId?: string | null;
  showName: string;
  season?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  /** Per-job LLM override; falls back to env/default in the extractor. */
  provider: Provider | null;
  model: string | null;
  forceReExtraction: boolean;
}

export interface ManualUploadResults {
  plan: ManualUploadPlan;
  /** Status of the single unit (reuses the episode-status vocabulary). */
  status: EpisodeStatus;
  phraseCount?: number;
  extractionId?: string;
  error?: string;
}
