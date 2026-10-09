"use client";

import { Loader2, RefreshCw, SpellCheck } from "lucide-react";

import JobStatusBanner from "@/app/components/common/JobStatusBanner";

import { useTranslationReviewBackfill } from "./useTranslationReviewBackfill";

/** Rough per-episode cost of a Sonnet 5.5 review, measured Oct 2026. */
const COST_PER_EPISODE = 0.05;

/** Admin: run the translation review for every episode that never had one. */
export default function TranslationReviewBackfill() {
  const { unreviewedCount, starting, message, error, start, refresh } =
    useTranslationReviewBackfill();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <JobStatusBanner />

      <div
        className="rounded-[var(--radius-lg)] p-6"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
      >
        <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
          A second model (Claude Sonnet 5.5) checks an episode&apos;s phrase
          translations against the whole episode and suggests fixes for the ones
          that would teach the wrong meaning. New imports are reviewed
          automatically; this reviews episodes extracted before that. Nothing
          changes until you accept a suggestion on the episode&apos;s edit page.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <div className="text-sm">
            {unreviewedCount == null ? (
              <span style={{ color: "var(--muted)" }}>Counting episodes…</span>
            ) : (
              <>
                <span className="font-display text-2xl" style={{ color: "var(--gold)" }}>
                  {unreviewedCount}
                </span>{" "}
                <span style={{ color: "var(--muted)" }}>
                  episode{unreviewedCount === 1 ? "" : "s"} not reviewed
                  {unreviewedCount > 0 &&
                    ` · about $${(unreviewedCount * COST_PER_EPISODE).toFixed(2)}`}
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
            disabled={starting || !unreviewedCount}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SpellCheck className="h-4 w-4" />
            )}
            Review all unreviewed
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
