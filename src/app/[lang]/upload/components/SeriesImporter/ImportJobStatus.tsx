"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Loader2, X, XCircle } from "lucide-react";

import type { ExtractionJob } from "@/lib/supabase";
import type { EpisodeState, ImportResults } from "@/lib/series-import/types";
import { ACTIVE_JOB_STATUSES, EPISODE_STATUS_META } from "./importStatus";

interface ImportJobStatusProps {
  /** The enqueued job; null while its first fetch is in flight. */
  job: ExtractionJob | null;
  onCancel: () => Promise<void>;
  /** The target show's page, linked once there's something to look at. */
  showHref: string | null;
}

const HEADINGS: Record<string, string> = {
  queued: "Queued — waiting for the worker to pick it up",
  pending: "Queued — waiting for the worker to pick it up",
  running: "Importing",
  completed: "Import finished",
  failed: "Import failed",
  cancelled: "Import cancelled",
};

/**
 * Live status of the import just started from this page: overall progress, the
 * worker's current step, per-episode outcomes and a summary once it finishes.
 * Updates by polling the job (useExtractionJob) while it's active.
 */
export default function ImportJobStatus({
  job,
  onCancel,
  showHref,
}: ImportJobStatusProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [cancelling, setCancelling] = useState(false);

  // Bring the card into view when an import starts — the button that started
  // it sits at the bottom of a long preview.
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const status = job?.status ?? "queued";
  const active = ACTIVE_JOB_STATUSES.has(status);
  const results = job?.results as unknown as ImportResults | undefined;
  const episodes: EpisodeState[] = results?.episodes
    ? Object.values(results.episodes).sort(
        (a, b) => a.episodeNumber - b.episodeNumber
      )
    : [];
  const summary = results?.summary;

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await onCancel();
    } catch (error) {
      console.error("Failed to cancel import:", error);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div
      ref={ref}
      className="rounded-lg p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusIcon status={job ? status : null} />
        <h3 className="text-lg font-semibold">
          {job ? HEADINGS[status] ?? status : "Starting import…"}
          {job?.series_title && status === "running" && (
            <span style={{ color: "var(--muted)" }}> {job.series_title}</span>
          )}
        </h3>
        <div className="flex-1" />
        {showHref && (
          <Link
            href={showHref}
            className="text-sm underline transition-opacity hover:opacity-80"
            style={{ color: "var(--blue)" }}
          >
            Open show page
          </Link>
        )}
        {job && active && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-1 rounded-md px-3 py-1 text-sm disabled:opacity-50"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
            }}
          >
            <X className="h-3.5 w-3.5" />
            {cancelling ? "Cancelling…" : "Cancel"}
          </button>
        )}
      </div>

      {job && (
        <>
          <div
            className="mb-2 h-2 w-full overflow-hidden rounded-full"
            style={{ background: "var(--surface2)" }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${job.progress ?? 0}%`, background: "var(--accent)" }}
            />
          </div>
          <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
            {job.completed_episodes + job.failed_episodes}/{job.total_episodes}{" "}
            episodes
            {status === "running" && job.current_episode && (
              <> · {job.current_episode}</>
            )}
          </p>
        </>
      )}

      {job?.error_message && (
        <div
          className="mb-4 rounded-md p-3 text-sm"
          style={{
            background: "rgba(229,9,20,.1)",
            border: "1px solid rgba(229,9,20,.35)",
            color: "var(--accent2)",
          }}
        >
          {job.error_message}
        </div>
      )}

      {!active && summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <SummaryCell value={summary.total} label="Total" color="var(--text)" />
          <SummaryCell value={summary.successful} label="Success" color="var(--green)" />
          <SummaryCell value={summary.alreadyExists} label="Existing" color="var(--blue)" />
          <SummaryCell value={summary.noSubtitle} label="No Subtitle" color="var(--gold)" />
          <SummaryCell value={summary.failed} label="Failed" color="var(--accent2)" />
        </div>
      )}

      {episodes.length > 0 && (
        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {episodes.map((ep) => (
            <EpisodeRow key={ep.episodeNumber} episode={ep} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string | null }) {
  if (status === null || status === "running") {
    return <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--accent)" }} />;
  }
  if (ACTIVE_JOB_STATUSES.has(status)) {
    return <Clock className="h-5 w-5" style={{ color: "var(--gold)" }} />;
  }
  if (status === "completed") {
    return <CheckCircle2 className="h-5 w-5" style={{ color: "var(--green)" }} />;
  }
  return <XCircle className="h-5 w-5" style={{ color: "var(--accent2)" }} />;
}

function EpisodeRow({ episode }: { episode: EpisodeState }) {
  const meta = EPISODE_STATUS_META[episode.status] ?? EPISODE_STATUS_META.pending;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-14 shrink-0 font-medium">Ep. {episode.episodeNumber}</span>
      <span className="truncate" style={{ color: "var(--muted)" }}>
        {episode.title}
      </span>
      <div className="flex-1" />
      <span
        className="flex shrink-0 items-center gap-1.5 text-xs"
        style={{ color: meta.color }}
        title={episode.error}
      >
        {meta.inFlight && <Loader2 className="h-3 w-3 animate-spin" />}
        {episode.status === "success" && episode.phraseCount != null
          ? `${episode.phraseCount} phrases${
              episode.essentialsCount != null
                ? ` · ${episode.essentialsCount} essentials`
                : episode.essentialsError
                  ? " · essentials failed"
                  : ""
            }`
          : meta.label}
      </span>
    </div>
  );
}

function SummaryCell({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-sm" style={{ color: "var(--muted)" }}>
        {label}
      </div>
    </div>
  );
}
