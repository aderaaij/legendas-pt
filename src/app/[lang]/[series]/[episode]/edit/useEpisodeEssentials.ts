import { useCallback, useEffect, useState } from "react";

import { getEpisodeEssentials } from "@/lib/db/essentials";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import type { EpisodeEssential } from "@/types/essentials";

/**
 * Admin view of an episode's essentials: loads them fresh (the public page is
 * ISR-cached) and enqueues a regenerate job for the worker.
 */
export function useEpisodeEssentials(episodeId: string | undefined) {
  const authedFetch = useAuthedFetch();
  const [essentials, setEssentials] = useState<EpisodeEssential[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!episodeId) return;
    setEssentials(await getEpisodeEssentials(episodeId));
  }, [episodeId]);

  useEffect(() => {
    (async () => {
      await reload();
    })();
  }, [reload]);

  const regenerate = useCallback(async () => {
    if (!episodeId) return;
    try {
      setRegenerating(true);
      setMessage(null);
      const res = await authedFetch("/api/essentials/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "episode", episodeId, force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setMessage(
        data.jobId
          ? "Queued — the worker is picking new essentials. Reload in a minute."
          : "This episode has no stored subtitle to pick essentials from."
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to queue regenerate");
    } finally {
      setRegenerating(false);
    }
  }, [authedFetch, episodeId]);

  return { essentials, regenerating, message, regenerate, reload };
}
