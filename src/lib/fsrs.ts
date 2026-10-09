/**
 * FSRS scheduling shared by every study deck (episode phrases and episode
 * essentials). Pure: converts a persisted progress row into a ts-fsrs Card,
 * applies one rating, and returns the columns to persist — no Supabase.
 *
 * `learning_steps` must round-trip through the DB: ts-fsrs uses it to walk a
 * new card through its short-term steps (1m → 10m), so dropping it keeps a card
 * stuck in Learning no matter how often it's rated Good. `elapsed_days` is not
 * needed — ts-fsrs derives it from `last_review`.
 */
import { createEmptyCard, fsrs, State, type Card, type Grade } from "ts-fsrs";
import type { StudyRating } from "@/types/spaced-repetition";

const scheduler = fsrs();

export type FsrsState = "New" | "Learning" | "Review" | "Relearning";

/** The FSRS progress columns every study table persists. */
export interface FsrsProgress {
  due_date: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: FsrsState;
  learning_steps: number;
  last_review?: string | null;
  last_rating?: StudyRating | null;
}

const TO_FSRS_STATE: Record<FsrsState, State> = {
  New: State.New,
  Learning: State.Learning,
  Review: State.Review,
  Relearning: State.Relearning,
};

const FROM_FSRS_STATE: Record<State, FsrsState> = {
  [State.New]: "New",
  [State.Learning]: "Learning",
  [State.Review]: "Review",
  [State.Relearning]: "Relearning",
};

function rowToCard(row: FsrsProgress): Card {
  return {
    due: new Date(row.due_date),
    stability: Number(row.stability),
    difficulty: Number(row.difficulty),
    elapsed_days: 0,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps ?? 0,
    reps: row.reps,
    lapses: row.lapses,
    state: TO_FSRS_STATE[row.state] ?? State.New,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

/**
 * Apply one rating to a card's progress (or to a brand-new card when `prev` is
 * null) and return the full set of columns to persist.
 */
export function scheduleReview(
  prev: FsrsProgress | null,
  rating: StudyRating,
  now: Date = new Date()
): Required<FsrsProgress> {
  const card = prev ? rowToCard(prev) : createEmptyCard(now);
  const { card: next } = scheduler.next(card, now, rating as Grade);
  return {
    due_date: next.due.toISOString(),
    stability: next.stability,
    difficulty: next.difficulty,
    scheduled_days: next.scheduled_days,
    reps: next.reps,
    lapses: next.lapses,
    state: FROM_FSRS_STATE[next.state],
    learning_steps: next.learning_steps,
    last_review: now.toISOString(),
    last_rating: rating,
  };
}
