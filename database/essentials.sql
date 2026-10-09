-- Episode Essentials: a small per-episode deck of the expressions you need to
-- follow an episode, drilled until every card is known.
--
--   essentials              per-language lexicon (one row per expression, in
--                           dictionary form). Shared across episodes, so study
--                           progress carries over and survives re-extraction.
--   episode_essentials      which essentials an episode uses, ranked, with the
--                           line as heard and its meaning in this episode.
--   user_essential_studies  per-user FSRS progress on a lexicon item.
--
-- Content tables are written only by the worker (service role, bypasses RLS);
-- anyone may read them. Progress rows are owner-only.
--
-- Also: episodes.essentials_generated_at/_params, and 'essentials_backfill' as
-- an extraction_jobs.job_type.
--
-- Idempotent: safe to run repeatedly. Runs in one transaction so a failure can
-- never leave the new tables behind without their RLS policies.

BEGIN;

-- 1) Lexicon --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.essentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL,
  expression TEXT NOT NULL,
  normalized_key TEXT NOT NULL,
  translation TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (language, normalized_key)
);

-- 2) Episode ↔ essential --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.episode_essentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  essential_id UUID NOT NULL REFERENCES public.essentials(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  translation TEXT NOT NULL,
  example TEXT,
  example_translation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (episode_id, essential_id)
);
CREATE INDEX IF NOT EXISTS idx_episode_essentials_episode_rank
  ON public.episode_essentials (episode_id, rank);
CREATE INDEX IF NOT EXISTS idx_episode_essentials_essential
  ON public.episode_essentials (essential_id);

-- 3) Per-user progress (FSRS; columns mirror src/lib/fsrs.ts FsrsProgress) ------
CREATE TABLE IF NOT EXISTS public.user_essential_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  essential_id UUID NOT NULL REFERENCES public.essentials(id) ON DELETE CASCADE,
  -- 'pt-en' = target → English, whatever the target language (see
  -- src/types/spaced-repetition.ts). Essentials are recognition-only for now.
  study_direction TEXT NOT NULL DEFAULT 'pt-en'
    CHECK (study_direction IN ('pt-en', 'en-pt')),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  stability DOUBLE PRECISION NOT NULL DEFAULT 0,
  difficulty DOUBLE PRECISION NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'New'
    CHECK (state IN ('New', 'Learning', 'Review', 'Relearning')),
  learning_steps INTEGER NOT NULL DEFAULT 0,
  last_review TIMESTAMP WITH TIME ZONE,
  last_rating INTEGER CHECK (last_rating BETWEEN 1 AND 4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, essential_id, study_direction)
);
CREATE INDEX IF NOT EXISTS idx_user_essential_studies_essential
  ON public.user_essential_studies (essential_id);

-- 4) Episode bookkeeping --------------------------------------------------------
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS essentials_generated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS essentials_params JSONB;

-- 5) updated_at triggers ----------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_essentials_updated_at ON public.essentials;
CREATE TRIGGER update_essentials_updated_at
  BEFORE UPDATE ON public.essentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_episode_essentials_updated_at ON public.episode_essentials;
CREATE TRIGGER update_episode_essentials_updated_at
  BEFORE UPDATE ON public.episode_essentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_essential_studies_updated_at ON public.user_essential_studies;
CREATE TRIGGER update_user_essential_studies_updated_at
  BEFORE UPDATE ON public.user_essential_studies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6) Row-Level Security -----------------------------------------------------------
ALTER TABLE public.essentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_essentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_essential_studies ENABLE ROW LEVEL SECURITY;

-- Content: public read; no write policies (service role only).
DROP POLICY IF EXISTS "Anyone can read essentials" ON public.essentials;
CREATE POLICY "Anyone can read essentials" ON public.essentials
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read episode essentials" ON public.episode_essentials;
CREATE POLICY "Anyone can read episode essentials" ON public.episode_essentials
  FOR SELECT USING (true);

-- Progress: owner only.
DROP POLICY IF EXISTS "Users read own essential studies" ON public.user_essential_studies;
CREATE POLICY "Users read own essential studies" ON public.user_essential_studies
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own essential studies" ON public.user_essential_studies;
CREATE POLICY "Users insert own essential studies" ON public.user_essential_studies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own essential studies" ON public.user_essential_studies;
CREATE POLICY "Users update own essential studies" ON public.user_essential_studies
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own essential studies" ON public.user_essential_studies;
CREATE POLICY "Users delete own essential studies" ON public.user_essential_studies
  FOR DELETE USING (auth.uid() = user_id);

-- Explicit grants (don't rely on default privileges surviving a restore).
GRANT SELECT ON public.essentials, public.episode_essentials TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_essential_studies TO authenticated;

-- 7) New job type -----------------------------------------------------------------
-- Drop whatever CHECK currently governs job_type (its name can vary after a
-- restore), then re-add it with 'essentials_backfill'.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'extraction_jobs'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%job_type%'
  LOOP
    EXECUTE format('ALTER TABLE extraction_jobs DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE extraction_jobs
  ADD CONSTRAINT extraction_jobs_job_type_check
  CHECK (job_type IN ('rtp_series', 'manual_upload', 'essentials_backfill'));

COMMIT;
