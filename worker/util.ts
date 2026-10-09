/** Small shared helpers for the worker. */
import type { ImportSummary } from "@/lib/series-import/types";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Exponential backoff with full jitter: `random(0, base * 2^attempt)`, capped.
 * `attempt` is 0-based (first retry = 0). Jitter avoids synchronized retries
 * across units/workers hammering RTP or the LLM provider at the same instant.
 */
export function backoffDelay(
  attempt: number,
  baseMs: number,
  capMs = 30000
): number {
  const ceiling = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.floor(Math.random() * ceiling);
}

/** Per-unit outcome of the backfill-style jobs (essentials, translation review). */
type UnitStatus = "success" | "skipped" | "no_subtitle" | "failed";

/**
 * Count finished units into the series-import summary shape, so
 * `JobStatusBanner` renders any job as-is (`skipped` counts as `alreadyExists`).
 */
export function summarizeUnits(
  units: Record<string, { status: UnitStatus }>,
  total: number
): ImportSummary {
  const vals = Object.values(units);
  const count = (status: UnitStatus) => vals.filter((u) => u.status === status).length;
  return {
    total,
    successful: count("success"),
    failed: count("failed"),
    alreadyExists: count("skipped"),
    noSubtitle: count("no_subtitle"),
  };
}

/** The job-row progress columns for a summary. */
export function progressFields(summary: ImportSummary) {
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
