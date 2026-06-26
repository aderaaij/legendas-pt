-- Store the full original subtitle text alongside each extraction so future
-- re-extractions (re-clean, re-prompt, re-match timestamps) don't require
-- re-scraping the source. Run this script in your Supabase SQL Editor.
--
-- Storage note: subtitles are small (~11-42 KB each), so a TEXT column is cheap
-- and travels with the standard public-schema backup/restore. We store the RAW
-- subtitle (timestamps included), not the cleaned AI text, to keep it fully
-- re-runnable.

ALTER TABLE phrase_extractions
ADD COLUMN IF NOT EXISTS content_full TEXT;

-- Verification: confirm the column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'phrase_extractions'
  AND column_name = 'content_full';
