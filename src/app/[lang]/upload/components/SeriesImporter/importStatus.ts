/** Display metadata for a series-import episode status (themed color + label). */
import type { EpisodeStatus } from "@/lib/series-import/types";

export const EPISODE_STATUS_META: Record<
  EpisodeStatus,
  { label: string; color: string; inFlight?: boolean }
> = {
  pending: { label: "Waiting", color: "var(--faint)" },
  scraping: { label: "Fetching subtitle", color: "var(--blue)", inFlight: true },
  extracting: { label: "Extracting phrases", color: "var(--blue)", inFlight: true },
  saving: { label: "Saving", color: "var(--blue)", inFlight: true },
  essentials: { label: "Picking essentials", color: "var(--blue)", inFlight: true },
  reviewing: { label: "Reviewing translations", color: "var(--blue)", inFlight: true },
  success: { label: "Done", color: "var(--green)" },
  already_exists: { label: "Already imported", color: "var(--blue)" },
  no_subtitle: { label: "No subtitle", color: "var(--gold)" },
  extraction_failed: { label: "Extraction failed", color: "var(--accent2)" },
  error: { label: "Error", color: "var(--accent2)" },
};

/** Job statuses during which the import is still queued or in progress. */
export const ACTIVE_JOB_STATUSES = new Set(["queued", "pending", "running"]);
