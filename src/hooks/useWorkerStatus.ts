import { useState, useEffect, useCallback } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";

interface WorkerStatus {
  /** True when at least one worker's heartbeat is recent. null = unknown. */
  online: boolean | null;
  /** False when the worker_status table isn't available (migration not applied). */
  available: boolean;
  lastSeenAt: string | null;
  refresh: () => Promise<void>;
}

/**
 * Polls the worker liveness endpoint (admin only). Used by WorkerStatusBadge to
 * show whether enqueued imports/uploads will actually be processed.
 */
export function useWorkerStatus(pollMs = 15000): WorkerStatus {
  const { user, isAdmin } = useAuth();
  const authedFetch = useAuthedFetch();
  const [online, setOnline] = useState<boolean | null>(null);
  const [available, setAvailable] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !isAdmin) return;
    try {
      const res = await authedFetch("/api/worker-status");
      if (!res.ok) return;
      const d = await res.json();
      setAvailable(d.available !== false);
      setOnline(d.available === false ? null : !!d.online);
      setLastSeenAt(d.lastSeenAt ?? null);
    } catch {
      // leave previous state on a transient failure
    }
  }, [authedFetch, user, isAdmin]);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs]);

  return { online, available, lastSeenAt, refresh };
}
