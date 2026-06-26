/** Small shared helpers for the worker. */

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
