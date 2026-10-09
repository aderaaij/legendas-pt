"use client";

import { RefreshCw, SpellCheck } from "lucide-react";

import type { ReviewedPhrase } from "@/lib/db/phrase-review";

import ReviewSuggestionRow from "./ReviewSuggestionRow";

interface TranslationReviewSectionProps {
  phrases: ReviewedPhrase[];
  reviewedAt: string | null;
  error: string | null;
  busyId: string | null;
  onAccept: (phrase: ReviewedPhrase) => void;
  onReject: (phrase: ReviewedPhrase) => void;
  onReload: () => void;
}

/**
 * The "Translation review" card: translations a second model thinks would
 * teach the wrong meaning. Nothing changes until the admin decides.
 */
export default function TranslationReviewSection({
  phrases,
  reviewedAt,
  error,
  busyId,
  onAccept,
  onReject,
  onReload,
}: TranslationReviewSectionProps) {
  const pending = phrases.filter((phrase) => phrase.review_status === "pending");
  const decided = phrases.filter((phrase) => phrase.review_status !== "pending");
  const renderRow = (phrase: ReviewedPhrase) => (
    <ReviewSuggestionRow
      key={phrase.id}
      phrase={phrase}
      busy={busyId === phrase.id}
      onAccept={onAccept}
      onReject={onReject}
    />
  );

  return (
    <div
      className="mb-8 rounded-[var(--radius-lg)] p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <SpellCheck className="h-6 w-6" style={{ color: "var(--muted)" }} />
        <h2 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
          Translation review
        </h2>
        {pending.length > 0 && (
          <span
            className="rounded-full px-3 py-1 text-sm font-medium"
            style={{ background: "rgba(245,196,81,.15)", color: "var(--gold)" }}
          >
            {pending.length} to check
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={onReload}
          className="grid h-9 w-9 place-items-center rounded-lg"
          style={{ border: "1px solid var(--border2)", color: "var(--muted)" }}
          aria-label="Reload translation review"
          title="Reload"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-6 text-sm" style={{ color: "var(--muted)" }}>
        {reviewedAt
          ? `A second model checked this episode's translations on ${new Date(reviewedAt).toLocaleDateString()}. Its suggestions can be wrong too — nothing changes until you decide.`
          : "Not reviewed yet. New imports are reviewed automatically after extraction."}
      </p>

      {error && (
        <p className="mb-4 text-sm" style={{ color: "var(--accent2)" }}>
          {error}
        </p>
      )}

      {pending.length > 0 ? (
        <ul className="space-y-2">{pending.map(renderRow)}</ul>
      ) : (
        reviewedAt && (
          <p className="text-sm" style={{ color: "var(--faint)" }}>
            Nothing left to check.
          </p>
        )
      )}

      {decided.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm" style={{ color: "var(--muted)" }}>
            {decided.length} already decided
          </summary>
          <ul className="mt-2 space-y-2">{decided.map(renderRow)}</ul>
        </details>
      )}
    </div>
  );
}
