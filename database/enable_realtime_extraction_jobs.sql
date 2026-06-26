-- Enable Supabase Realtime for extraction_jobs so the admin UI receives job
-- progress as push events instead of polling. RLS still applies (the existing
-- "Users can view their own extraction jobs" policy), so each admin only gets
-- their own jobs. Idempotent.
--
-- Default replica identity (primary key) is sufficient: postgres_changes
-- delivers the full NEW row on INSERT/UPDATE. We deliberately do NOT set
-- REPLICA IDENTITY FULL — extraction_jobs is updated frequently during an import
-- (per-episode + heartbeat) and FULL would log the whole row (incl. the results
-- jsonb) on every write.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'extraction_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE extraction_jobs;
  END IF;
END $$;
