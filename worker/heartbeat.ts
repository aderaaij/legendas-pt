/**
 * Worker liveness heartbeat. Independently of any job, the worker periodically
 * upserts a row into `worker_status` so the admin UI can show "worker online".
 *
 * Best-effort: if the table doesn't exist yet (migration not applied), it logs
 * once and keeps quiet — the worker still does its real work. On shutdown it
 * removes its row so the UI flips to offline immediately.
 */
import os from "node:os";
import type { SupabaseClient } from "@supabase/supabase-js";

const WORKER_ID = `${os.hostname()}:${process.pid}`;

export function startWorkerHeartbeat(
  supabase: SupabaseClient,
  log: (msg: string) => void,
  intervalMs: number
): () => Promise<void> {
  let warned = false;

  const beat = async () => {
    const { error } = await supabase.from("worker_status").upsert(
      {
        worker_id: WORKER_ID,
        hostname: os.hostname(),
        pid: process.pid,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "worker_id" }
    );
    if (error && !warned) {
      warned = true;
      log(
        `worker_status heartbeat unavailable (${error.message}) — "worker online" disabled until database/worker_status_table.sql is applied`
      );
    }
  };

  void beat(); // register immediately
  const timer = setInterval(() => void beat(), intervalMs);

  return async () => {
    clearInterval(timer);
    try {
      await supabase.from("worker_status").delete().eq("worker_id", WORKER_ID);
    } catch {
      // best-effort — if it fails, the row simply goes stale and reads offline
    }
  };
}
