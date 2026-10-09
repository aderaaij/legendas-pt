"use client";

import { Loader2, RefreshCw, Sparkles } from "lucide-react";

import JobStatusBanner from "@/app/components/common/JobStatusBanner";

import { useEssentialsBackfill } from "./useEssentialsBackfill";

/** Admin: generate essentials for every extracted episode that has none yet. */
export default function EssentialsBackfill() {
  const { missingCount, starting, message, error, start, refresh } =
    useEssentialsBackfill();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <JobStatusBanner />

      <div
        className="rounded-[var(--radius-lg)] p-6"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
      >
        <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
          Essentials are the 20–30 expressions a learner needs to follow an
          episode. New imports pick them automatically; this generates them for
          episodes extracted before that, from their stored subtitle (one small
          LLM call per episode, run by the worker).
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <div className="text-sm">
            {missingCount == null ? (
              <span style={{ color: "var(--muted)" }}>Counting episodes…</span>
            ) : (
              <>
                <span className="font-display text-2xl" style={{ color: "var(--gold)" }}>
                  {missingCount}
                </span>{" "}
                <span style={{ color: "var(--muted)" }}>
                  episode{missingCount === 1 ? "" : "s"} without essentials
                </span>
              </>
            )}
          </div>
          <div className="flex-1" />
          <button
            onClick={refresh}
            className="grid h-9 w-9 place-items-center rounded-lg"
            style={{ border: "1px solid var(--border2)", color: "var(--muted)" }}
            aria-label="Recount"
            title="Recount"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={start}
            disabled={starting || !missingCount}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate missing essentials
          </button>
        </div>

        {message && (
          <p className="mt-4 text-sm" style={{ color: "var(--green)" }}>
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 text-sm" style={{ color: "var(--accent2)" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
