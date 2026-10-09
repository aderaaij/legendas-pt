-- Persist ts-fsrs's short-term learning step on user_card_studies.
--
-- ts-fsrs (v5) walks a new card through short-term steps (1m → 10m) and tracks
-- where it is in `card.learning_steps`. The study service never stored it, so
-- every review started again from step 0 and a card rated Good never left the
-- Learning state. src/lib/fsrs.ts now round-trips it.
--
-- Idempotent: safe to run repeatedly.

ALTER TABLE public.user_card_studies
  ADD COLUMN IF NOT EXISTS learning_steps INTEGER NOT NULL DEFAULT 0;
