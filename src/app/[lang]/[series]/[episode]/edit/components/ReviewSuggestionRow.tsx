import { Check, Loader2, X } from "lucide-react";

import type { ReviewedPhrase } from "@/lib/db/phrase-review";

interface ReviewSuggestionRowProps {
  phrase: ReviewedPhrase;
  busy: boolean;
  onAccept: (phrase: ReviewedPhrase) => void;
  onReject: (phrase: ReviewedPhrase) => void;
}

/** One flagged translation: current vs suggested, why, and the decision. */
export default function ReviewSuggestionRow({
  phrase,
  busy,
  onAccept,
  onReject,
}: ReviewSuggestionRowProps) {
  const pending = phrase.review_status === "pending";
  // Accepting overwrites the translation, so an accepted row only has one.
  const accepted = phrase.review_status === "accepted";
  return (
    <li
      className="rounded-lg px-4 py-3"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    >
      <p className="font-bold">{phrase.phrase}</p>
      <dl className="mt-2 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-sm">
        <dt style={{ color: "var(--faint)" }}>{accepted ? "Now" : "Current"}</dt>
        <dd style={{ color: accepted ? "var(--text)" : "var(--muted)" }}>
          {phrase.translation}
        </dd>
        {!accepted && (
          <>
            <dt style={{ color: "var(--faint)" }}>Suggested</dt>
            <dd>{phrase.review_translation}</dd>
          </>
        )}
      </dl>
      {phrase.review_issue && (
        <p className="mt-2 text-xs italic" style={{ color: "var(--faint)" }}>
          Why: {phrase.review_issue}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {pending ? (
          <>
            <button
              onClick={() => onAccept(phrase)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Use suggestion
            </button>
            <button
              onClick={() => onReject(phrase)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
              style={{ border: "1px solid var(--border2)", color: "var(--muted)" }}
            >
              <X className="h-4 w-4" />
              Keep current
            </button>
          </>
        ) : (
          <span
            className="text-xs font-medium"
            style={{ color: phrase.review_status === "accepted" ? "var(--green)" : "var(--faint)" }}
          >
            {phrase.review_status === "accepted" ? "Suggestion used" : "Kept the original"}
          </span>
        )}
      </div>
    </li>
  );
}
