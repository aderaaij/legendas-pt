import { useCallback, useEffect, useState } from "react";

import { useAuthedFetch } from "@/hooks/useAuthedFetch";

interface StartResponse {
  jobId: string | null;
  count: number;
  error?: string;
}

/** Counts episodes without essentials and enqueues a backfill for them. */
export function useEssentialsBackfill() {
  const authedFetch = useAuthedFetch();
  const [missingCount, setMissingCount] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const post = useCallback(
    async (dryRun: boolean): Promise<StartResponse> => {
      const res = await authedFetch("/api/essentials/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "missing", dryRun }),
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
      setMissingCount((await post(true)).count);
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
          ? `Queued essentials for ${count} episode${count === 1 ? "" : "s"}.`
          : "Every episode already has essentials."
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start backfill");
    } finally {
      setStarting(false);
    }
  }, [post, refresh]);

  return { missingCount, starting, message, error, start, refresh };
}
