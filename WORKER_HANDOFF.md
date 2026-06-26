# Worker / Data-Plane Hand-off Briefing

> **Audience:** a Claude instance running on an always-on local server (optionally
> in Docker) that has been pointed at this repository. You have the code but **not**
> the conversation that produced this brief — everything you need is here.
>
> **Goal:** build a robust, persistent **worker** that processes RTP→phrase-extraction
> jobs out-of-band from the Next.js web app, so imports no longer race a serverless
> timeout or depend on a browser tab staying open.

---

## 0. Read these first (in order)

1. `CLAUDE.md` — project overview, conventions, schema summary, env vars.
2. This file (all of it).
3. The current import implementation you're replacing/reusing:
   - `src/lib/rtp-import/types.ts` — the job "plan" + per-episode status model.
   - `src/lib/rtp-import/process-episode.ts` — the per-episode pipeline (the heart).
   - `src/app/api/rtp-import/step/route.ts` — exact progress-write semantics to mirror.
   - `src/app/api/rtp-import/start/route.ts` — how a job + plan is created.
   - `src/app/api/extract-phrases/route.ts` — the phrase-save logic to extract (see §4).
   - `src/lib/llm/` — the provider-agnostic LLM layer.
   - `src/lib/supabase-admin.ts`, `src/lib/db/extraction-jobs.ts` — DB access.

**Before writing code, confirm the deferred decisions with the user (see §9).**

---

## 1. Why this exists (context not obvious from the code)

- The web app deploys on **Vercel (serverless)**. A full RTP series import is long
  (N episodes × ~10–60s each: scrape + LLM extraction + DB writes), which exceeds
  Vercel's function timeout (~60–300s).
- The **current production design is a workaround**: the import is chunked into
  one-episode-per-request, and a **browser-side driver** (`RTPImportProvider`) loops
  calling `POST /api/rtp-import/step` until done. It works, but: it only runs while a
  tab is open, can't do real concurrency, and still races the per-episode timeout on
  Vercel Hobby.
- **The target architecture is a control-plane / data-plane split:**

  | Plane | Runs on | Job |
  |---|---|---|
  | Control plane | Next.js on Vercel | Admin UI, auth, reads, **enqueue** jobs. No heavy work. |
  | **Data plane (YOU)** | This always-on machine | Claim jobs, scrape, extract, write progress. No timeout. |
  | Shared spine | Supabase | DB + auth + Realtime. |

- **The two planes never call each other directly — only through Supabase.** The
  worker needs **outbound only** (Supabase, RTP, the LLM APIs). No inbound ports, no
  tunnels, no public IP. That's what makes a local/Docker worker clean.

---

## 2. Project facts you'd otherwise have to discover

- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Supabase (Postgres,
  Auth, RLS). Tailwind 4. The app is "CENA", a Portuguese-learning app that extracts
  useful phrases from TV subtitles and translates them via an LLM.
- **LLM layer is provider-agnostic** (already built): OpenAI / Anthropic / Google via
  the **Vercel AI SDK v7** (`ai` ^7, `@ai-sdk/openai|anthropic|google` ^4, `zod` ^4).
  Entry point: `extractPhrases(content, override?)` in `src/lib/llm/extract-phrases.ts`
  → `{ phrases, truncated, resolved }`. Provider/model resolution
  (`src/lib/llm/providers.ts` `resolveSelection`): per-request override → `LLM_PROVIDER`
  / `LLM_MODEL` env → built-in defaults (`src/lib/llm/types.ts` `DEFAULT_MODELS`:
  openai `gpt-4.1-mini`, anthropic `claude-sonnet-4-6`, google `gemini-2.5-flash`).
- **RTP scraping** (`src/lib/rtp-scraper.ts`, `RTPScraperService`): `scrapeSeries(url)`,
  `scrapeEpisodeSubtitle(rtpEpisode)`, `parseRTPUrl(url)`, `normalizeSeriesName(name)`.
  Node-compatible (HTTP fetch + HTML parsing). **Known surface:** subtitle + episode
  scraping needs **no auth**; RTP's JSON API is auth-walled; **catalog enumeration
  (discovering all shows/episodes) is an open gap** — relevant for the §8 cron.
- **Subtitle handling:** `src/utils/subtitleUtils.ts` (`parseVTTWithTimestamps`,
  `parseSRTWithTimestamps`, `matchPhrasesToTimestamps`, `cleanSubtitleContent`).
  Full raw subtitle is stored per extraction in `phrase_extractions.content_full`.
- **Service-role DB access:** `src/lib/supabase-admin.ts` `createServiceClient()` uses
  `SUPABASE_SECRET_KEY` and **bypasses RLS**. The worker uses this for ALL DB access.
  (The anon key cannot write.) There is no `psql` dependency — everything goes through
  `@supabase/supabase-js`.
- **Deduplication is built in:** phrases are content-hashed (`generateContentHash` in
  `src/utils/extractPhrasesUtils.ts`); re-processing an episode resolves to
  `already_exists`. **This makes the worker safely idempotent** — crashes/retries don't
  duplicate work.

---

## 3. The data model you'll drive (no schema changes needed to start)

Job tracking already exists. Tables: `extraction_jobs` (job + progress),
`phrase_extractions`, `extracted_phrases`, `episodes`, `shows`.

`ExtractionJob` (`src/types/database.ts`): `id, user_id, job_type:'rtp_series'|'manual_upload',
status:'pending'|'running'|'completed'|'failed'|'cancelled', progress, total_episodes,
completed_episodes, failed_episodes, current_episode?, error_message?, results?(jsonb),
created_at, updated_at, completed_at?`.

The `results` jsonb holds the whole import state (shapes in `src/lib/rtp-import/types.ts`):

```ts
{
  plan: { showId, season, seriesTitle, seriesUrl, saveToDatabase, forceReExtraction,
          provider, model, episodes: [{ episodeNumber, rtpId, title, url, airDate }] },
  episodes: { [episodeNumber]: { status, episodeNumber, title, phraseCount?, extractionId?, error?, updatedAt } },
  summary: { total, successful, failed, alreadyExists, noSubtitle }
}
```

`EpisodeStatus` = `pending | scraping | extracting | saving | success | already_exists |
no_subtitle | extraction_failed | error`. `TERMINAL_STATUSES` (exported) = the last five.
Top-level `progress`/`completed_episodes`/`failed_episodes`/`current_episode` are also
updated each step. **`src/app/api/rtp-import/step/route.ts` is your reference for the exact
write cadence — mirror it.**

DB helpers: `src/lib/db/extraction-jobs.ts` (`createExtractionJob`, `updateExtractionJob`,
`getExtractionJob`, `getActiveExtractionJobs`, `cancelExtractionJob`). They take an optional
client arg — **pass a service client**, or have the worker read/write `extraction_jobs`
directly via `@supabase/supabase-js`.

---

## 4. Required refactor FIRST (Phase 0) — makes the worker clean

`processEpisode` (`src/lib/rtp-import/process-episode.ts`) currently extracts+saves by
doing an HTTP `fetch` to the Next route `/api/extract-phrases` (authorized with the
service key). **A worker must not depend on the Next server being reachable.**

The real extract+save pipeline lives **inline inside** `src/app/api/extract-phrases/route.ts`:
timestamp parsing (`subtitleUtils`), `extractPhrases()` call, phrase validation, dedup,
episode handling, and inserts into `phrase_extractions` + `extracted_phrases` (storing
`provider`/`model` in `extraction_params`).

**Extract that into a pure lib function**, e.g. `src/lib/phrase-extraction/save-extraction.ts`:
`saveExtraction({ content, fileType, filename, showId, episodeId, language, provider, model,
saveToDatabase, forceReExtraction, supabase }) → { phrases, total, truncated, extractionId, provider, model }`.
Then:
- The Next route `extract-phrases/route.ts` calls it (keep the route working — it's still
  used by the manual `/upload` single-file flow and must stay backward-compatible).
- `processEpisode` calls it **directly** instead of `fetch`ing the route.

This is the "second consumer" extraction the team has been deferring. **Keep it pure:** no
Next imports, no `next/server`, deps injected (`supabase` passed in) — so the worker can
import it. (`src/lib/` is intentionally framework-free; preserve that.)

---

## 5. What to build (the worker)

A standalone Node/TypeScript process that:

1. **Claims** a pending `rtp_series` job (see §6 for queue options).
2. For that job, walks `results.plan.episodes`, and for each non-terminal episode runs the
   core pipeline: `RTPScraperService.scrapeEpisodeSubtitle` → find/create `episodes` row →
   `saveExtraction(...)` (from §4). This is exactly what `processEpisode` does today — reuse it.
3. Writes **incremental progress** each episode (and ideally each sub-stage:
   `scraping`/`extracting`): `current_episode`, `results.episodes[n]`, counts, `progress` —
   mirror `step/route.ts`. **Don't over-write** (Realtime/polling reads this; a write per
   sub-stage is fine, a write per token is not).
4. **Concurrency + rate limiting:** process several episodes in parallel with a bounded pool
   + a polite limiter for RTP and the LLM provider's rate limits. (The old serial loop used a
   crude 2s sleep; you can do a real token bucket. Start conservative — e.g. 2–3 concurrent.)
5. **Retries** per episode with backoff; after N failures mark `extraction_failed` and move on
   (don't fail the whole job).
6. **Cancellation:** check `job.status === 'cancelled'` between episodes and stop.
7. **Finalize:** when no non-terminal episodes remain, write `summary` + `status`
   (`completed`/`failed`) + `completed_at`.
8. **Stale reclaim on startup:** find jobs left `running` with non-terminal episodes whose
   `updatedAt` is old (a previous worker died) and resume them. This is the durability story.
9. **Graceful shutdown** (SIGTERM/SIGINT): finish or checkpoint the in-flight episode and exit;
   the job stays resumable.

---

## 6. Queue design (start simple; confirm with user)

- **Tier 1 — reuse `extraction_jobs` as the queue (recommended start).** Add a `queued`
  status: the web app sets `queued` on enqueue; the worker claims `queued → running`. For a
  **single worker** this can be a plain poll (every few seconds) + `getActiveExtractionJobs`.
  If you ever run **multiple workers**, make the claim **atomic** (`UPDATE … WHERE status='queued'
  RETURNING …`, or a `claimed_by`/`claimed_at` heartbeat column) to prevent double-processing.
- **Tier 2 — pgmq (Postgres Message Queue, available on Supabase)** if you want
  visibility-timeout + retries + dead-letter for free, staying on Supabase.
- **Web-side change:** `POST /api/rtp-import/start` should now **only create the job + plan and
  set status `queued`** (or `pending`), then return — it must **stop driving**. The worker drains.

---

## 7. Progress delivery: swap polling → Supabase Realtime (web-side, but coordinate)

Today the UI polls `/api/extraction-jobs` every 3–5s (`src/hooks/useExtractionJobs.ts`).
The better design once a worker writes the rows: enable **Supabase Realtime** on
`extraction_jobs` and subscribe client-side (`postgres_changes`, filtered by `user_id`/job id).
The worker just writes; Realtime pushes to the admin UI and the series-page
`ImportProgressPanel` (`src/app/[series]/components/ImportProgressPanel.tsx` + `useShowImportJob`)
instantly. The **worker itself doesn't need Realtime** — it only writes. (No realtime is used
anywhere in the repo today; you'd add it.) This is a nice-to-have; polling keeps working in the
meantime.

---

## 8. Optional Phase: catalog auto-discovery cron

Run a scheduler inside the worker (e.g. `node-cron`) that periodically enumerates RTP and
**enqueues imports for new shows/episodes** — turning the library from "admin manually imports"
into self-updating. This is the open "catalog enumeration gap" (RTP's JSON catalog API is
auth-walled; you'll need to solve discovery — scraping listing pages, sitemaps, etc.).
TVDB enrichment for new shows is available via `src/lib/tvdb.ts` (`TVDBService`). Treat this as
a later phase after the core worker is solid.

---

## 9. Decisions to confirm with the user before building

1. **Code layout:** (a) add a `worker/` dir in THIS repo importing from `src/lib/*` (fastest;
   note the `@/*` tsconfig path alias needs resolving in a non-Next process — use `tsx` +
   tsconfig paths, `vite-node`, or a small `tsc`/`esbuild` build), or (b) restructure into a
   monorepo (`packages/core`, `apps/web`, `apps/worker`) — cleaner long-term, more upfront work.
2. **Docker or bare process?** (user mentioned maybe Docker.)
3. **Queue tier:** jobs-table (Tier 1) vs pgmq (Tier 2).
4. **Concurrency level** and rate limits (depends on their LLM plan + politeness to RTP).
5. **Single worker or several?** (decides whether atomic claim is mandatory.)
6. **Realtime now or later?**

---

## 10. Env / secrets the worker needs (names from `.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY` — **service role; full DB access, bypasses RLS.** The worker is fully
  trusted; keep it off any public surface.
- `OPENAI_API_KEY` (default provider), optionally `ANTHROPIC_API_KEY`,
  `GOOGLE_GENERATIVE_AI_API_KEY`, and `LLM_PROVIDER` / `LLM_MODEL` to change the default.
- `NEXT_PUBLIC_TVDB_API_KEY` — only if you build the discovery/enrichment cron.
- Do **not** use the anon key for writes. Node 20+ recommended (the AI SDK v7 + `fetch`).

---

## 11. What to retire once the worker is live

- `src/contexts/RTPImportContext.tsx` (`RTPImportProvider`) and its mount in `src/app/layout.tsx`.
- `src/app/api/rtp-import/step/route.ts` (the worker does stepping now).
- The resume-on-mount logic in the provider.
- Change `start/route.ts` to enqueue-only (don't drive).

**Keep:** the `extraction_jobs` model, `process-episode.ts` core, `save-extraction.ts` (new),
`ImportProgressPanel` + `useShowImportJob` (switch polling → Realtime), `JobStatusBanner`,
and the existing cancel endpoint `POST /api/extraction-jobs {action:'cancel'}`.

---

## 12. Suggested phasing

- **Phase 0:** extract `saveExtraction` into a pure lib; `processEpisode` calls it directly
  (no HTTP). Verify the Next `/upload` single-file flow and the `extract-phrases` route still work.
- **Phase 1 (MVP):** worker, single concurrency, polls `extraction_jobs`, drains one job, writes
  progress. Change `/start` to enqueue-only. Retire the client driver.
- **Phase 2 (robust):** concurrency + rate limit, retries/backoff, stale-job reclaim, graceful
  shutdown, a heartbeat (e.g. a `worker_status` row or `last_heartbeat`) so the UI can show
  "worker online."
- **Phase 3:** Realtime progress (web-side).
- **Phase 4:** catalog auto-discovery cron.

---

## 13. Verification

Run the worker locally against the same Supabase project. From the web admin UI (`/upload`,
admin login required), enqueue an import (it should now just create a `queued` job and return).
Then confirm the **worker** does the work:
- `extraction_jobs.results` fills in **incrementally** (plan → per-episode `episodes` → summary);
- per-episode rows appear in `phrase_extractions` / `extracted_phrases` / `episodes`;
- `progress`/counts climb; the series-page `ImportProgressPanel` reflects it (admin only);
- **cancel** from the UI stops it;
- **kill the worker mid-job and restart** → it reclaims and resumes (already-done episodes skip via dedup).

Tip: the exact per-episode write semantics to copy are in `src/app/api/rtp-import/step/route.ts`
and `src/lib/rtp-import/process-episode.ts`. Read them before writing the worker loop.

---

## 14. Guardrails

- Keep `src/lib/` framework-free (no Next imports) so it's shareable with the worker.
- The worker holds the service key — it is fully privileged; never expose it on a network surface.
- Idempotency is your friend: rely on the existing dedup; design every step to be safely re-runnable.
- Don't silently cap work — if you bound concurrency or skip episodes, log it.
- This is an admin/personal tool with infrequent imports; favor robustness + clarity over scale.
