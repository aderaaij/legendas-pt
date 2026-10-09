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

COMMIT;
