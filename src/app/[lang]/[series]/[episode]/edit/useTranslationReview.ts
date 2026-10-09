import { useCallback, useEffect, useState } from "react";

import { getEpisodeReview, type ReviewedPhrase } from "@/lib/db/phrase-review";
import { updatePhrase } from "@/lib/db/phrases";

/**
 * Admin view of an episode's translation review: loads the reviewer's
 * suggestions fresh and records the admin's decision on each. Accepting swaps
 * in the suggested translation; rejecting keeps the current one.
 */
export function useTranslationReview(episodeId: string | undefined) {
  const [phrases, setPhrases] = useState<ReviewedPhrase[]>([]);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  return { phrases, reviewedAt, error, busyId, reload, accept, reject };
}
