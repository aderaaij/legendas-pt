// MUST be first: loads .env.worker and validates env before any module that
// reads process.env at import time (e.g. the shared Supabase client).
import { workerEnv } from "./bootstrap";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase-admin";
import { getExtractionJob } from "@/lib/db/extraction-jobs";
import type { ExtractionJob } from "@/types/database";
import { processRtpSeriesJob } from "./process-rtp-series";
import { processManualUploadJob } from "./process-manual-upload";
import { startWorkerHeartbeat } from "./heartbeat";
import { sleep } from "./util";

/**
 * The orchestrator (worker / data plane). A persistent process that polls
 * `extraction_jobs`, claims one job at a time, and runs its pipeline to
 * completion. Outbound-only: it talks to Supabase, RTP, and the LLM provider, and
 * exposes no inbound ports. All Supabase writes use the service-role client.
 *
 * Robustness: claims are atomic, a per-job heartbeat keeps a live job's
 * `updated_at` fresh, and orphaned `running` jobs (a crashed worker) are
 * reclaimed once stale. Safe to run multiple workers.
 */

const JOB_TYPES = ["rtp_series", "manual_upload"] as const;

const log = (msg: string) =>
  console.log(`[worker ${new Date().toISOString()}] ${msg}`);

let shuttingDown = false;

/**
 * Claim the next workable job: a freshly `queued` job, else an orphaned
 * `running` job whose heartbeat has gone stale (a crashed worker).
 */
async function claimNextJob(
  supabase: SupabaseClient
): Promise<ExtractionJob | null> {
  return (await claimQueued(supabase)) ?? (await reclaimStale(supabase));
}

/**
 * Claim the oldest `queued` job and move it to `running`.
 *
 * The claim is ATOMIC: the UPDATE is guarded by `status = 'queued'`, which
 * compiles to `UPDATE ... WHERE id = ? AND status = 'queued'`. Postgres row
 * locking serializes concurrent claims, so with multiple workers exactly one
 * wins; the losers match zero rows and poll again.
 */
async function claimQueued(
  supabase: SupabaseClient
): Promise<ExtractionJob | null> {
  const { data, error } = await supabase
    .from("extraction_jobs")
    .select("*")
    .in("job_type", JOB_TYPES)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(`Failed to poll queued jobs: ${error.message}`);

  const candidate = (data?.[0] as ExtractionJob | undefined) ?? null;
  if (!candidate) return null;

  const { data: claimed, error: claimError } = await supabase
    .from("extraction_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", candidate.id)
    .eq("status", "queued") // atomic guard — only the winner matches a row
    .select();
  if (claimError) {
    throw new Error(`Failed to claim job ${candidate.id}: ${claimError.message}`);
  }
  if (!claimed || claimed.length === 0) return null; // lost the race

  const job = claimed[0] as ExtractionJob;
  log(`claimed job ${job.id} (${job.series_title ?? "untitled"})`);
  return job;
}

/**
 * Reclaim an orphaned `running` job — one whose `updated_at` is older than the
 * stale threshold, meaning the worker that held it died (a live worker bumps the
 * heartbeat well within the window). The reclaim is atomic the same way: the
 * UPDATE is guarded by `status = 'running'` AND `updated_at < cutoff`, so after
 * the winner bumps `updated_at` the others match zero rows. Resuming is safe —
 * terminal units are skipped and persistence dedups.
 */
async function reclaimStale(
  supabase: SupabaseClient
): Promise<ExtractionJob | null> {
  const cutoff = new Date(Date.now() - workerEnv.staleMs).toISOString();

  const { data, error } = await supabase
    .from("extraction_jobs")
    .select("*")
    .in("job_type", JOB_TYPES)
    .eq("status", "running")
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(`Failed to poll stale jobs: ${error.message}`);

  const candidate = (data?.[0] as ExtractionJob | undefined) ?? null;
  if (!candidate) return null;

  const { data: claimed, error: claimError } = await supabase
    .from("extraction_jobs")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", candidate.id)
    .eq("status", "running")
    .lt("updated_at", cutoff) // atomic guard against another reclaimer
    .select();
  if (claimError) {
    throw new Error(`Failed to reclaim job ${candidate.id}: ${claimError.message}`);
  }
  if (!claimed || claimed.length === 0) return null; // lost the race

  const job = claimed[0] as ExtractionJob;
  log(`reclaimed orphaned job ${job.id} (${job.series_title ?? "untitled"})`);
  return job;
}

async function isJobCancelled(
  supabase: SupabaseClient,
  jobId: string
): Promise<boolean> {
  const job = await getExtractionJob(jobId, supabase);
  return !job || job.status === "cancelled";
}

/**
 * Keep a claimed job's `updated_at` fresh while we process it, so other workers
 * don't mistake it for orphaned (and reclaim it) during a long unit. Guarded by
 * `status = 'running'` so it no-ops once the job is finalized/cancelled.
 */
function startHeartbeat(supabase: SupabaseClient, jobId: string) {
  return setInterval(() => {
    void supabase
      .from("extraction_jobs")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("status", "running")
      .then(({ error }) => {
        if (error) log(`heartbeat error for job ${jobId}: ${error.message}`);
      });
  }, workerEnv.heartbeatMs);
}

/** Process at most one job. Returns true if a job was handled. */
async function tick(supabase: SupabaseClient): Promise<boolean> {
  const job = await claimNextJob(supabase);
  if (!job) return false;

  const heartbeat = startHeartbeat(supabase, job.id);
  try {
    const hooks = {
      log,
      isCancelled: () => isJobCancelled(supabase, job.id),
      shouldStop: () => shuttingDown,
      maxRetries: workerEnv.maxRetries,
      retryBaseMs: workerEnv.retryBaseMs,
    };
    if (job.job_type === "manual_upload") {
      await processManualUploadJob(supabase, job, hooks);
    } else {
      await processRtpSeriesJob(supabase, job, hooks);
    }
  } catch (err) {
    // Leave the job 'running' so it resumes once stale (dedup makes re-processing
    // safe). The heartbeat stops, so reclaim picks it up after the stale window.
    log(
      `job ${job.id} errored: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}

function installShutdown() {
  const onSignal = (sig: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`received ${sig} — finishing current episode, then exiting`);
  };
  process.on("SIGTERM", () => onSignal("SIGTERM"));
  process.on("SIGINT", () => onSignal("SIGINT"));
}

async function main() {
  const supabase = createServiceClient();
  installShutdown();
  const stopHeartbeat = startWorkerHeartbeat(
    supabase,
    log,
    workerEnv.heartbeatMs
  );
  log(
    `started — polling every ${workerEnv.pollIntervalMs}ms (rtp_series, manual_upload)`
  );

  while (!shuttingDown) {
    try {
      const didWork = await tick(supabase);
      if (!didWork && !shuttingDown) await sleep(workerEnv.pollIntervalMs);
    } catch (err) {
      log(
        `poll error: ${err instanceof Error ? err.message : String(err)}`
      );
      if (!shuttingDown) await sleep(workerEnv.pollIntervalMs);
    }
  }

  await stopHeartbeat();
  log("stopped");
}

main().catch((err) => {
  log(`fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
