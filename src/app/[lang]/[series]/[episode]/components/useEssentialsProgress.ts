import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { studyService } from "@/lib/study-service";
import { scheduleReview, type FsrsProgress } from "@/lib/fsrs";
import type { StudyRating } from "@/types/spaced-repetition";

/** An essential counts as known once its latest answer was a pass. */
const isKnown = (progress: FsrsProgress | undefined) =>
  (progress?.last_rating ?? 0) >= 3;

/**
 * The learner's progress on an episode's essentials, shared by the readiness
 * pill and the essentials session so the pill updates as you drill.
 *
 * Progress is keyed by lexicon item, so essentials learned in other episodes
 * already count here. Guests get the same behaviour in memory; signed-in users'
 * reviews are scheduled with FSRS and saved in order.
 */
export function useEssentialsProgress(essentialIds: string[]) {
  const { user } = useAuth();
  const userId = user?.id;
  const [progress, setProgress] = useState<Map<string, FsrsProgress>>(new Map());
  // Mirrors `progress` for scheduling inside callbacks without stale closures.
  const progressRef = useRef(progress);
  // Saves run one after another so a later review never lands before an earlier one.
  const saveChain = useRef<Promise<void>>(Promise.resolve());

  const idsKey = essentialIds.join(",");

  useEffect(() => {
    if (!userId || essentialIds.length === 0) return;
    (async () => {
      const rows = await studyService.getEssentialStudies(userId, essentialIds);
      const loaded = new Map<string, FsrsProgress>(
        rows.map((row) => [row.essential_id, row])
      );
      progressRef.current = loaded;
      setProgress(loaded);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, idsKey]);

  const recordReview = useCallback(
    (essentialId: string, rating: StudyRating) => {
      const next = scheduleReview(progressRef.current.get(essentialId) ?? null, rating);
      const updated = new Map(progressRef.current).set(essentialId, next);
      progressRef.current = updated;
      setProgress(updated);

      if (userId) {
        saveChain.current = saveChain.current
          .then(() => studyService.saveEssentialStudy(userId, essentialId, next))
          .catch(() => {
            // Logged by the service; the drill carries on regardless.
          });
      }
    },
    [userId]
  );

  const knownIds = useMemo(
    () =>
      new Set(essentialIds.filter((id) => isKnown(progress.get(id)))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress, idsKey]
  );

  return { knownIds, recordReview };
}
