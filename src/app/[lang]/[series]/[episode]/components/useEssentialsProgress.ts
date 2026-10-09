import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { studyService } from "@/lib/study-service";
import { scheduleReview, type FsrsProgress } from "@/lib/fsrs";
import type { StudyRating } from "@/types/spaced-repetition";

/** An essential counts as known once its latest answer was a pass. */
const isKnown = (progress: FsrsProgress | undefined) =>
  (progress?.last_rating ?? 0) >= 3;

/** Progress belongs to one user (null = guest); another owner's is ignored. */
interface ProgressState {
  owner: string | null;
  rows: Map<string, FsrsProgress>;
  /** The owner's saved rows have been loaded (always true for a guest). */
  loaded: boolean;
}

const EMPTY_ROWS: Map<string, FsrsProgress> = new Map();

/**
 * The learner's progress on an episode's essentials, shared by the readiness
 * pill and the essentials session so the pill updates as you drill.
 *
 * Progress is keyed by lexicon item, so essentials learned in other episodes
 * already count here. Guests get the same behaviour in memory; signed-in users'
 * reviews are scheduled with FSRS and saved in order. `ready` stays false until
 * a signed-in user's saved progress is in, so a review is never scheduled from
 * (and saved over) a blank card.
 */
export function useEssentialsProgress(essentialIds: string[]) {
  const { user, loading: authLoading } = useAuth();
  const owner = user?.id ?? null;
  const [state, setState] = useState<ProgressState>({
    owner: null,
    rows: new Map(),
    loaded: true,
  });
  // Mirrors `state` for scheduling inside callbacks without stale closures.
  const stateRef = useRef(state);
  // Ids reviewed while a load was in flight; their newer in-memory rows win.
  const reviewedDuringLoad = useRef(new Set<string>());
  // Saves run one after another so a later review never lands before an earlier one.
  const saveChain = useRef<Promise<void>>(Promise.resolve());

  const commit = useCallback((next: ProgressState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const idsKey = essentialIds.join(",");

  useEffect(() => {
    if (!owner || essentialIds.length === 0) return;
    let cancelled = false;
    reviewedDuringLoad.current = new Set();
    (async () => {
      const saved = await studyService.getEssentialStudies(owner, essentialIds);
      if (cancelled) return;
      const rows = new Map<string, FsrsProgress>(
        saved.map((row) => [row.essential_id, row])
      );
      const current = stateRef.current;
      if (current.owner === owner) {
        for (const id of reviewedDuringLoad.current) {
          const newer = current.rows.get(id);
          if (newer) rows.set(id, newer);
        }
      }
      commit({ owner, rows, loaded: true });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, idsKey, commit]);

  const recordReview = useCallback(
    (essentialId: string, rating: StudyRating) => {
      const current = stateRef.current;
      const rows = current.owner === owner ? current.rows : EMPTY_ROWS;
      const next = scheduleReview(rows.get(essentialId) ?? null, rating);
      reviewedDuringLoad.current.add(essentialId);
      commit({
        owner,
        rows: new Map(rows).set(essentialId, next),
        loaded: current.owner === owner ? current.loaded : owner === null,
      });

      if (owner) {
        saveChain.current = saveChain.current
          .then(() => studyService.saveEssentialStudy(owner, essentialId, next))
          .catch(() => {
            // Logged by the service; the drill carries on regardless.
          });
      }
    },
    [owner, commit]
  );

  const ownRows = state.owner === owner ? state.rows : EMPTY_ROWS;
  const knownIds = useMemo(
    () => new Set(essentialIds.filter((id) => isKnown(ownRows.get(id)))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ownRows, idsKey]
  );

  const ready =
    !authLoading &&
    (owner === null ||
      essentialIds.length === 0 ||
      (state.owner === owner && state.loaded));

  return { knownIds, recordReview, ready };
}
