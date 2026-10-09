import { useCallback, useEffect, useState } from "react";

import { useAuthedFetch } from "@/hooks/useAuthedFetch";

interface StartResponse {
  jobId: string | null;
  count: number;
  error?: string;
}

/** Counts episodes never reviewed and enqueues a translation review for them. */
export function useTranslationReviewBackfill() {
  const authedFetch = useAuthedFetch();
  const [unreviewedCount, setUnreviewedCount] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const post = useCallback(
    async (dryRun: boolean): Promise<StartResponse> => {
      const res = await authedFetch("/api/phrase-review/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "unreviewed", dryRun }),
      });
      const data: StartResponse = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    },
    [authedFetch]
  );

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setUnreviewedCount((await post(true)).count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to count episodes");
    }
  }, [post]);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  const start = useCallback(async () => {
    try {
      setStarting(true);
      setError(null);
      setMessage(null);
      const { jobId, count } = await post(false);
      setMessage(
        jobId
          ? `Queued a translation review for ${count} episode${count === 1 ? "" : "s"}.`
          : "Every episode has been reviewed."
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start the review");
    } finally {
      setStarting(false);
    }
  }, [post, refresh]);

  return { unreviewedCount, starting, message, error, start, refresh };
}
