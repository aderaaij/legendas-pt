import { useCallback, useEffect, useState } from "react";

import type { EpisodeEssential } from "@/types/essentials";
import type { StudyRating } from "@/types/spaced-repetition";

/** A missed card comes back after this many others (sooner if fewer remain). */
const REQUEUE_GAP = 3;

interface Round {
  /** Cards in this round. */
  total: number;
  /** Ids still to pass; the front is the current card. */
  queue: string[];
  /** Ids missed at least once this round. */
  missed: Set<string>;
  answers: number;
  gotIt: number;
  showAnswer: boolean;
  startedAt: number;
  endedAt: number | null;
}

const startRound = (ids: string[]): Round => ({
  total: ids.length,
  queue: ids,
  missed: new Set(),
  answers: 0,
  gotIt: 0,
  showAnswer: false,
  startedAt: Date.now(),
  endedAt: null,
});

interface UseEssentialsSessionProps {
  essentials: EpisodeEssential[];
  knownIds: Set<string>;
  onReview: (essentialId: string, rating: StudyRating) => void;
}

/**
 * A drill that ends only when every card has been answered "got it": missed
 * cards come back a few cards later in the same round. Starts with the
 * essentials not yet known (in rank order); when all are known it offers to
 * practice them all. Mounted only while the session modal is open.
 */
export function useEssentialsSession({
  essentials,
  knownIds,
  onReview,
}: UseEssentialsSessionProps) {
  // Snapshot what's known at open, so reviews during the round don't reshuffle it.
  const [knownAtStart] = useState(
    () => essentials.filter((e) => knownIds.has(e.id)).length
  );
  const [round, setRound] = useState<Round>(() =>
    startRound(essentials.filter((e) => !knownIds.has(e.id)).map((e) => e.id))
  );

  const byId = new Map(essentials.map((e) => [e.id, e]));
  const currentId = round.queue[0];
  const current = currentId ? byId.get(currentId) : undefined;
  const allKnown = round.total === 0;
  const complete = round.total > 0 && round.queue.length === 0;

  const flip = useCallback(() => {
    setRound((r) => ({ ...r, showAnswer: !r.showAnswer }));
  }, []);

  const answer = useCallback(
    (passed: boolean) => {
      if (!currentId || !round.showAnswer) return;
      onReview(currentId, passed ? 3 : 1);
      setRound((r) => {
        const rest = r.queue.slice(1);
        const queue = passed
          ? rest
          : [...rest.slice(0, REQUEUE_GAP), currentId, ...rest.slice(REQUEUE_GAP)];
        return {
          ...r,
          queue,
          missed: passed ? r.missed : new Set(r.missed).add(currentId),
          answers: r.answers + 1,
          gotIt: r.gotIt + (passed ? 1 : 0),
          showAnswer: false,
          endedAt: queue.length === 0 ? Date.now() : null,
        };
      });
    },
    [currentId, round.showAnswer, onReview]
  );

  const practiceAll = useCallback(() => {
    setRound(startRound(essentials.map((e) => e.id)));
  }, [essentials]);

  // Keyboard: Space flips, 1 = again, 2 = got it.
  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        flip();
      } else if (round.showAnswer && (event.key === "1" || event.key === "2")) {
        event.preventDefault();
        answer(event.key === "2");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, round.showAnswer, flip, answer]);

  const firstTry = round.total - round.missed.size;

  return {
    current,
    showAnswer: round.showAnswer,
    allKnown,
    complete,
    knownAtStart,
    remaining: round.queue.length,
    total: round.total,
    passed: round.total - round.queue.length,
    answers: round.answers,
    gotIt: round.gotIt,
    firstTryPercent: round.total ? Math.round((firstTry / round.total) * 100) : 0,
    durationSeconds: round.endedAt
      ? Math.floor((round.endedAt - round.startedAt) / 1000)
      : 0,
    flip,
    answer,
    practiceAll,
  };
}
