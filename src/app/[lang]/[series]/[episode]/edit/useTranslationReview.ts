import { useCallback, useEffect, useState } from "react";

import { getEpisodeReview, type ReviewedPhrase } from "@/lib/db/phrase-review";
import { updatePhrase } from "@/lib/db/phrases";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";

/**
 * Admin view of an episode's translation review: loads the reviewer's
 * suggestions fresh, records the admin's decision on each (accepting swaps in
 * the suggested translation; rejecting keeps the current one), and queues a
 * fresh review for the worker on request.
 */
export function useTranslationReview(episodeId: string | undefined) {
  const authedFetch = useAuthedFetch();
  const [phrases, setPhrases] = useState<ReviewedPhrase[]>([]);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const reload = useCallback(async () => {
    if (!episodeId) return;
    try {
      const review = await getEpisodeReview(episodeId);
      setPhrases(review.phrases);
      setReviewedAt(review.reviewedAt);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the review");
    }
  }, [episodeId]);

  useEffect(() => {
    (async () => {
      await reload();
    })();
  }, [reload]);

  const decide = useCallback(async (phrase: ReviewedPhrase, accept: boolean) => {
    try {
      setBusyId(phrase.id);
      const updated = await updatePhrase(
        phrase.id,
        accept && phrase.review_translation
          ? { translation: phrase.review_translation, review_status: "accepted" }
          : { review_status: "rejected" }
      );
      setPhrases((current) =>
        current.map((p) =>
          p.id === phrase.id
            ? { ...p, translation: updated.translation, review_status: updated.review_status }
            : p
        )
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the decision");
    } finally {
      setBusyId(null);
    }
  }, []);

  const accept = useCallback((phrase: ReviewedPhrase) => decide(phrase, true), [decide]);
  const reject = useCallback((phrase: ReviewedPhrase) => decide(phrase, false), [decide]);

  const requestReview = useCallback(async () => {
    if (!episodeId) return;
    try {
      setRequesting(true);
      setError(null);
      setMessage(null);
      const res = await authedFetch("/api/phrase-review/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "episode", episodeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setMessage(
        data.jobId
          ? "Queued — the worker is reviewing the translations. Reload in a minute or two."
          : "This episode has no stored subtitle to review against."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue the review");
    } finally {
      setRequesting(false);
    }
  }, [authedFetch, episodeId]);

  return {
    phrases,
    reviewedAt,
    error,
    message,
    busyId,
    requesting,
    reload,
    accept,
    reject,
    requestReview,
  };
}
