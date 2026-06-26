-- Add a 'queued' status to extraction_jobs (worker queue, Tier 1).
--
-- The persistent worker claims jobs in 'queued' and moves them to 'running'.
-- Vercel's enqueue endpoints set 'queued' instead of driving the work itself.
-- Idempotent: safe to run against an existing database.

-- Drop whatever CHECK constraint currently governs `status` (the name can vary,
-- e.g. after restoring from a dump), then re-add it with 'queued' included.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'extraction_jobs'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE extraction_jobs DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE extraction_jobs
  ADD CONSTRAINT extraction_jobs_status_check
  CHECK (status IN ('queued', 'pending', 'running', 'completed', 'failed', 'cancelled'));
