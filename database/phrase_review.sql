-- Translation review: after an extraction, a stronger model checks the phrase
-- translations against the whole episode and suggests fixes for the ones that
-- would teach a learner the wrong meaning. Suggestions are not applied: an
-- admin accepts or rejects each one on the episode edit page.
--
--   extracted_phrases.review_translation  the suggested translation
--   extracted_phrases.review_issue        what the current one would wrongly teach
--   extracted_phrases.review_status       pending | accepted | rejected
--   phrase_extractions.reviewed_at        when the review last ran (null = never)
--   phrase_extractions.review_params      provider / model / prompt version
--
-- Written by the worker (service role); accept/reject goes through the existing
-- admin update policy on extracted_phrases. No new policies needed.
--
-- Also: 'phrase_review' as an extraction_jobs.job_type (review on request from
-- the edit page, or every unreviewed episode from /upload). Run AFTER
-- essentials.sql, which re-creates the job_type check without it.
--
-- Idempotent: safe to run repeatedly.

BEGIN;

ALTER TABLE public.extracted_phrases
  ADD COLUMN IF NOT EXISTS review_translation TEXT,
  ADD COLUMN IF NOT EXISTS review_issue TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'extracted_phrases_review_status_check'
  ) THEN
    ALTER TABLE public.extracted_phrases
      ADD CONSTRAINT extracted_phrases_review_status_check
      CHECK (review_status IN ('pending', 'accepted', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_extracted_phrases_review
  ON public.extracted_phrases (extraction_id)
  WHERE review_status IS NOT NULL;

ALTER TABLE public.phrase_extractions
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS review_params JSONB;

-- New job type: drop whatever CHECK currently governs job_type (its name can
-- vary after a restore), then re-add it with 'phrase_review'.
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
  CHECK (job_type IN ('rtp_series', 'manual_upload', 'essentials_backfill', 'phrase_review'));

COMMIT;
