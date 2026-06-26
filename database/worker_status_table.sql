-- Liveness heartbeat for the data-plane worker(s), so the admin UI can show
-- whether an extraction worker is online (enqueued jobs will actually process).
--
-- Only the service role touches this table (the worker writes its heartbeat; the
-- server-side /api/worker-status route reads it). RLS is enabled with no policy,
-- which blocks anon/authenticated direct access while the service role bypasses
-- RLS. Idempotent.
CREATE TABLE IF NOT EXISTS worker_status (
  worker_id TEXT PRIMARY KEY,
  hostname TEXT,
  pid INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_status_last_seen
  ON worker_status(last_seen_at DESC);

ALTER TABLE worker_status ENABLE ROW LEVEL SECURITY;
