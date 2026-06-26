# Legendas-PT Worker (data plane)

A persistent process that does **all** scraping and LLM extraction for the app,
off Vercel. The Next.js app (control plane) only enqueues jobs and reads results;
the worker claims jobs from Supabase and runs them to completion.

```
Vercel (UI · enqueue) ──> Supabase (jobs + results) <── Worker (scrape + extract + persist)
```

The worker is **outbound-only** — it connects to Supabase, RTP, and the LLM
provider, and exposes no inbound ports. It can run anywhere with outbound network
(a local box, a container) with no tunnels or public IP.

## Pieces

- `index.ts` — orchestrator: poll loop, claim, cancellation, graceful shutdown.
- `process-rtp-series.ts` — runs one `rtp_series` job (the looped equivalent of
  the old `/api/rtp-import/step`), writing per-episode progress to the job row.
- `env.ts` / `bootstrap.ts` — env loading + validation (bootstrap runs first).

It reuses the shared, framework-free libraries under `src/lib/*`:
`@/lib/extractor` (subtitle → phrases, the pure core), `@/lib/rtp-scraper`,
`@/lib/db/extractions` (`persistExtraction`), and `@/lib/rtp-import/process-episode`
(the per-episode pipeline). The `@/*` alias is resolved by `tsx` from
`tsconfig.json` — no separate build step.

## Run locally

```bash
cp .env.worker.example .env.worker   # then fill it in
chmod 600 .env.worker
npm run worker                       # or: npm run worker:watch
```

`npm run worker` loads `.env.worker` from the repo root (via `bootstrap.ts`).

## Run with Docker (ardencore)

```bash
cp .env.worker.example .env.worker && chmod 600 .env.worker   # fill it in
docker compose up -d --build
docker compose logs -f worker
```

Compose injects the env from `.env.worker`; the container has no `.env.worker`
file, so `bootstrap.ts` skips the file load and reads the environment directly.

## Environment

See `.env.worker.example`. The worker needs `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (only because a shared lib builds the public
client at import), `SUPABASE_SECRET_KEY` (its real credential — service role,
bypasses RLS), and at least one LLM key (`OPENAI_API_KEY` by default).

## Behaviour & scope (Phase 1)

- Handles `rtp_series` and `manual_upload` jobs, one job at a time per worker
  (single internal concurrency).
- Claims `queued` jobs with an **atomic claim** (`UPDATE ... WHERE status =
  'queued'`), so running **multiple workers is safe** — each job goes to exactly
  one worker, no double-processing. (One worker is plenty for this workload; the
  value is surviving overlap, e.g. the Docker worker plus a local `npm run
  worker`.)
- Does **not** reclaim orphaned `running` jobs yet (see Phase 3) — avoids
  grabbing long-abandoned rows on startup.
- Honors cancellation (`status = 'cancelled'`) and graceful shutdown
  (SIGTERM/SIGINT) between episodes; an interrupted job stays resumable.

Not yet (later phases): a bounded per-worker concurrency pool + rate limiting,
bounded retries/backoff, **stale-reclaim of orphaned `running` jobs** (with a
heartbeat row), and Supabase Realtime progress.
