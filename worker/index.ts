// MUST be first: loads .env.worker and validates env before any module that
// reads process.env at import time (e.g. the shared Supabase client).
import { workerEnv } from "./bootstrap";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase-admin";
import { getExtractionJob } from "@/lib/db/extraction-jobs";
import type { ExtractionJob } from "@/types/database";
import { processRtpSeriesJob } from "./process-rtp-series";

/**
 * The orchestrator (worker / data plane). A single persistent process that polls
 * `extraction_jobs`, claims one job at a time, and runs its pipeline to
 * completion. Outbound-only: it talks to Supabase, RTP, and the LLM provider, and
 * exposes no inbound ports. All Supabase writes use the service-role client.
 *
 * Phase 1 scope: `rtp_series` jobs, single concurrency. (`manual_upload`,
 * a bounded pool, rate limiting, and stale reclaim land in later phases.)
 */

const log = (msg: string) =>
  console.log(`[worker ${new Date().toISOString()}] ${msg}`);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let shuttingDown = false;

/**
 * Claim the next `queued` job (oldest first) and move it to `running`. Single
 * worker, so no atomic claim is needed; multi-worker would require one.
 *
 * Phase 1 deliberately does NOT reclaim orphaned `running` jobs: doing that
 * safely needs a staleness/heartbeat guard (otherwise a fresh worker would grab
 * long-abandoned `running` rows and redo their work). That's the Phase 3
 * stale-reclaim feature.
 */
async function claimNextJob(
  supabase: SupabaseClient
): Promise<ExtractionJob | null> {
  const { data, error } = await supabase
    .from("extraction_jobs")
    .select("*")
    .eq("job_type", "rtp_series")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`Failed to poll jobs: ${error.message}`);
  }

  const job = (data?.[0] as ExtractionJob | undefined) ?? null;
  if (!job) return null;

  const { error: claimError } = await supabase
    .from("extraction_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", job.id);
  if (claimError) {
    throw new Error(`Failed to claim job ${job.id}: ${claimError.message}`);
  }
  log(`claimed job ${job.id} (${job.series_title ?? "untitled"})`);

  return { ...job, status: "running" };
}

async function isJobCancelled(
  supabase: SupabaseClient,
  jobId: string
): Promise<boolean> {
  const job = await getExtractionJob(jobId, supabase);
  return !job || job.status === "cancelled";
}

/** Process at most one job. Returns true if a job was handled. */
async function tick(supabase: SupabaseClient): Promise<boolean> {
  const job = await claimNextJob(supabase);
  if (!job) return false;

  try {
    await processRtpSeriesJob(supabase, job, {
      log,
      isCancelled: () => isJobCancelled(supabase, job.id),
      shouldStop: () => shuttingDown,
    });
  } catch (err) {
    // Leave the job 'running' so it resumes on the next poll / restart (dedup
    // makes re-processing safe). A persistently failing job will retry — Phase 3
    // adds bounded retries + a dead-letter path.
    log(
      `job ${job.id} errored: ${err instanceof Error ? err.message : String(err)}`
    );
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
  log(`started — polling every ${workerEnv.pollIntervalMs}ms (rtp_series)`);

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

  log("stopped");
}

main().catch((err) => {
  log(`fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
