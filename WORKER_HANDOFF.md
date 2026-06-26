# Worker / Data-Plane Hand-off Briefing

> **Audience:** a Claude instance on an always-on local server (optionally Docker) that has
> been pointed at this repository. You have the code but **not** the conversation that
> produced this brief — everything you need is here.
>
> **Goal:** move *all* heavy/LLM work off Vercel into a persistent **worker** that is the
> single extraction engine for the app, structured as decoupled pieces that can later be
> run (and offered) as separate services.

---

## 0. Read these first (in order)

1. `CLAUDE.md` — project overview, conventions, schema summary, env vars.
2. This file (all of it). **Before writing code, confirm the §14 decisions with the user.**
3. The code you'll reuse / refactor:
   - `src/lib/llm/` — provider-agnostic LLM layer (the extractor's engine).
   - `src/lib/rtp-scraper.ts` — the RTP scraper (the scraper).
   - `src/lib/rtp-import/process-episode.ts` + `src/app/api/rtp-import/step/route.ts` — the
     current per-episode pipeline + exact progress-write semantics to mirror.
   - `src/app/api/extract-phrases/route.ts` — LLM + save logic to split (see §6).
   - `src/utils/subtitleUtils.ts`, `src/utils/extractPhrasesUtils.ts` — subtitle/content utils.
   - `src/lib/supabase-admin.ts`, `src/lib/db/extraction-jobs.ts`, `src/lib/db/extractions.ts` — DB.
   - The manual-upload flow: `src/app/upload/` + `src/utils/phraseExtractionFlow.ts` + `src/utils/phraseExtractionApi.ts`.

---

## 1. Target architecture

```
            ┌──────────────────────────────┐
  Vercel →  │  CONTROL PLANE (Next.js)      │   UI · auth · reads · ENQUEUE jobs.
            │  No LLM. No scraping.         │   Holds NO LLM keys.
            └───────────────┬──────────────┘
                            │  (jobs + content + progress)
                       ┌────▼─────┐
                       │ SUPABASE │   DB · Auth · Realtime.  The only thing both planes touch.
                       └────▲─────┘
                            │
            ┌───────────────┴──────────────┐   DATA PLANE (this machine).
  Worker →  │  ORCHESTRATOR                 │   Claims jobs, owns lifecycle + all Supabase writes.
            │   ├── SCRAPER     (pure)      │   Source → subtitle text.   Holds no secrets.
            │   └── EXTRACTOR   (pure)      │   Subtitle text → phrases.  Holds the LLM keys.
            └──────────────────────────────┘   Outbound-only: Supabase, RTP, LLM APIs.
```

Principles:
- **The two planes never call each other directly — only through Supabase.** The worker is
  **outbound-only** (no inbound ports, no tunnels, no public IP). That's what lets it run on a
  local box or a Docker container with zero networking setup.
- **The worker is the single extraction engine for *all* job types** — both `rtp_series`
  imports and `manual_upload` single files (the `manual_upload` job type already exists in the
  schema but is currently unused). After this work, **Vercel does zero LLM work.**
- **Three pieces, designed to decouple** (see §2). Run them as **one worker process now**;
  the boundaries are clean enough to split into separate services later with config + a deploy,
  not a rewrite.

---

## 2. The three pieces + the contract

| Piece | Responsibility | State? | Reusable / offerable? |
|---|---|---|---|
| **Scraper** | A source adapter: source ref → subtitle content + metadata. RTP today; a `SubtitleSource` interface so other sources slot in. | **Pure** — no DB, no job model, no Next. Outbound HTTP only. | Yes (source-adapter lib) |
| **Extractor / Translator** | The LLM engine: subtitle text → phrases (extract+translate). Later a second mode: text → translated cues (the planned full-subtitle-translation feature). Provider-agnostic. | **Pure** — no DB, no Next. Holds LLM keys at runtime. | **Yes — this is the valuable, offerable core** |
| **Orchestrator** (the worker) | Owns the job lifecycle + **all Supabase reads/writes**: claim job → (scrape) → extract → persist → write progress. The stateful glue. | Stateful (Supabase). | No — app-specific |

**The rule that makes the two packages reusable: keep *all* Supabase / job-state in the
orchestrator.** Scraper and extractor take inputs and return outputs — nothing else. (This is
the existing "keep `src/lib/` framework-free" discipline, applied at the service seam.)

**The contract** between scraper and extractor is just **subtitle text + small metadata** —
serializable, so the seam works unchanged whether it's a function call (one process), a queue
message (two services), or an HTTP request (extractor offered standalone). Design to it now.

**Decoupling spectrum** (you start at level 1; the user decides when/if to climb):
1. **Two packages, one worker process** ← start here. Orchestrator imports both.
2. **Two services + a queue.** Scraper emits "subtitle ready"; extractor consumes. Different
   scaling/rate-limit profiles (RTP-politeness vs LLM-rate-limit), independent failure.
3. **Extractor as a standalone HTTP service** — the "offer it decoupled" surface, for other
   apps/users to use the extraction/translation engine without your scraper or DB.

---

## 3. Why this exists (context not obvious from the code)

- The web app deploys on **Vercel (serverless)**: functions die at a timeout (~60–300s) and
  freeze after responding. Any multi-minute or even single-large-file LLM job is at risk there.
- The current production import is a **browser-driven chunked workaround** (`RTPImportProvider`
  loops `POST /api/rtp-import/step`). It works but only while a tab is open, can't do real
  concurrency, and still races the per-episode timeout on Hobby. Manual upload
  (`/api/extract-phrases`) has the same single-call timeout exposure.
- Decision: move all heavy work to a persistent worker, and structure it as scraper + extractor
  + orchestrator so the generic extractor can later be offered/scaled on its own.

---

## 4. Building blocks already in the repo

- **LLM engine (the extractor's core), already provider-agnostic & pure:** `src/lib/llm/`.
  - `extract-phrases.ts` → `extractPhrases(content, override?)` returns `{ phrases, truncated, resolved }`.
  - `providers.ts` → `resolveSelection` (per-call override → `LLM_PROVIDER`/`LLM_MODEL` env →
    defaults), `getModel`, `MissingApiKeyError`, `UnknownProviderError`.
  - `types.ts` → `Provider`, `DEFAULT_MODELS` (openai `gpt-4.1-mini`, anthropic
    `claude-sonnet-4-6`, google `gemini-2.5-flash`), `API_KEY_ENV`, `LlmSelection`.
  - Stack: **Vercel AI SDK v7** (`ai` ^7, `@ai-sdk/openai|anthropic|google` ^4, `zod` ^4). Node-compatible.
- **Scraper:** `src/lib/rtp-scraper.ts` `RTPScraperService` — `scrapeSeries(url)`,
  `scrapeEpisodeSubtitle(rtpEpisode)`, `parseRTPUrl`, `normalizeSeriesName`. HTTP + HTML parse,
  no DB. Known surface: subtitle/episode scraping needs **no auth**; RTP's JSON API is auth-walled;
  **catalog enumeration is an open gap** (relevant only if you build the §later discovery cron).
- **Subtitle/content utils (pure):** `src/utils/subtitleUtils.ts` (`parseVTTWithTimestamps`,
  `parseSRTWithTimestamps`, `matchPhrasesToTimestamps`, `cleanSubtitleContent`),
  `src/utils/extractPhrasesUtils.ts` (`generateContentHash`, `parseShowInfo`).
- **DB / persistence:** `src/lib/supabase-admin.ts` `createServiceClient()` (uses
  `SUPABASE_SECRET_KEY`, **bypasses RLS** — the worker uses this for everything). Job helpers in
  `src/lib/db/extraction-jobs.ts`; phrase-save primitive in `src/lib/db/extractions.ts`
  (`saveExtraction`). The anon key cannot write; there is no `psql` dependency.
- **Idempotency is built in:** phrases are content-hashed (`generateContentHash`); re-processing
  resolves to `already_exists` (dedup on `content_hash` + episode find/create). **The worker is
  therefore safely retry-able** — crashes don't duplicate work.

---

## 5. Data model (no schema change needed to start)

Tables: `extraction_jobs` (job + progress), `phrase_extractions`, `extracted_phrases`,
`episodes`, `shows`. `ExtractionJob` (`src/types/database.ts`): `id, user_id,
job_type:'rtp_series'|'manual_upload', status:'pending'|'running'|'completed'|'failed'|'cancelled',
progress, total_episodes, completed_episodes, failed_episodes, current_episode?, error_message?,
results?(jsonb), created_at, updated_at, completed_at?`.

`results` jsonb carries the whole job state (shapes in `src/lib/rtp-import/types.ts`): `plan`
(import config + episode list), `episodes` (per-episode live status keyed by number), `summary`.
`EpisodeStatus` = `pending | scraping | extracting | saving | success | already_exists |
no_subtitle | extraction_failed | error`; `TERMINAL_STATUSES` = the last five.
**`src/app/api/rtp-import/step/route.ts` is the reference for the exact write cadence — mirror it.**

**Both job types use this table.** For `manual_upload`, the plan carries the uploaded subtitle
**content** (the browser sends it to Vercel, which embeds it in the job — see §6c) plus
`{ showId?, episodeId?, language, fileType, provider?, model? }`; there's a single "episode"
(the file). For `rtp_series`, the plan carries the RTP episode list and the worker scrapes each.

---

## 6. Phase 0 — the refactors that create the seams (do first, keep the app working)

These are pure-refactor steps that establish the scraper/extractor/orchestrator boundaries
**without** building the worker yet, so `main` keeps working at each step.

**(a) Split `extract-phrases/route.ts` into extractor + persistence.** Today the route does it
all inline: clean content → `extractPhrases` (LLM) → validate → timestamp-match → dedup → write
`phrase_extractions` + `extracted_phrases` (+ `provider`/`model` in `extraction_params`). Pull it
into two pure libs:
   - **Extractor** (`src/lib/extractor/…`, or grow `src/lib/llm`): `content (+ lang, provider/model)
     → { phrases, truncated }`, including the subtitle parsing/timestamp-matching (`subtitleUtils`).
     **No DB.** This is the offerable core.
   - **Persistence** (`src/lib/db/extractions.ts` already has `saveExtraction` — consolidate here):
     `{ phrases, content, showId, episodeId, … , supabase } → { extractionId }`. **DB only.**
   The Next `extract-phrases` route becomes a thin caller of both (keep it working — it's still
   used by the manual flow until §6c lands).

**(b) Make `processEpisode` orchestration, not a tangle.** `src/lib/rtp-import/process-episode.ts`
currently `fetch`es the Next route `/api/extract-phrases` (a hidden coupling to the web server).
Rewrite it to call the **scraper** then the **extractor** then **persistence** directly:
`const sub = await scraper.fetchSubtitle(ep); const { phrases } = await extractor.extract(sub.content, …); await persist.save({ phrases, … })`. No HTTP hop — this is what frees the worker from needing Vercel reachable.

**(c) Turn manual upload into a `manual_upload` job.** Today: browser → `/api/extract-phrases`
(LLM on Vercel) → `src/utils/phraseExtractionFlow.ts` saves via `PhraseExtractionService.saveExtraction`.
New: browser POSTs the file **content** to a Vercel enqueue endpoint → it creates a `manual_upload`
job (content embedded in `results.plan`; subtitle files are small — jsonb is fine, or Supabase
Storage for outliers) → returns jobId. The **worker** processes it (extractor + persistence; no
scraper). Results surface via polling/Realtime; the admin reviews/edits the saved phrases in the
existing editor. Retire the client-side `phraseExtractionFlow` LLM call.

---

## 7. The orchestrator / worker

A persistent Node/TypeScript process that:
1. **Claims** a pending job (`rtp_series` or `manual_upload`) — see §8.
2. **Runs the right pipeline:**
   - `rtp_series`: for each non-terminal plan episode → scraper.fetchSubtitle → extractor.extract
     → persistence.save → write per-episode progress.
   - `manual_upload`: read embedded content → extractor.extract → persistence.save → progress.
   Reuse the exact progress-write semantics from `step/route.ts` (current_episode, sub-stage,
   `results.episodes[n]`, counts, `progress`). Don't over-write (Realtime/polling reads it).
3. **Concurrency + rate limiting** — a bounded pool (start 2–3) with polite limiters for RTP and
   the LLM provider. (The old loop used a crude 2s sleep; do a real limiter.)
4. **Retries** per unit with backoff; mark `extraction_failed` after N and continue the job.
5. **Cancellation** — honor `status === 'cancelled'` between units.
6. **Finalize** — write `summary` + `completed`/`failed` + `completed_at`.
7. **Stale reclaim on startup** — resume jobs left `running` with old `updatedAt` (a prior worker died).
8. **Graceful shutdown** (SIGTERM/SIGINT) — checkpoint the in-flight unit; the job stays resumable.

---

## 8. Queue design (start simple; confirm with user)

- **Tier 1 (start): `extraction_jobs` as the queue.** Add a `queued` status (Vercel sets it on
  enqueue; worker claims `queued → running`). A single worker can just poll every few seconds.
  Multiple workers ⇒ make the claim **atomic** (`UPDATE … WHERE status='queued' RETURNING …`, or a
  `claimed_by`/`claimed_at` heartbeat) to avoid double-processing.
- **Tier 2 (later): pgmq / Supabase Queues** for visibility-timeout + retries + DLQ, staying on Supabase.
- If/when scraper and extractor become **separate services**, the seam between them is a second
  queue topic ("subtitle ready") or an HTTP call — same serializable contract from §2.

---

## 9. Progress: switch polling → Supabase Realtime (web-side)

Today the UI polls `/api/extraction-jobs` every 3–5s (`src/hooks/useExtractionJobs.ts`). Better:
enable **Realtime** on `extraction_jobs` and subscribe client-side (`postgres_changes`, filtered
by `user_id`/job id); the worker's writes push to the admin UI and the series-page
`ImportProgressPanel` instantly. The worker only writes — it needs no Realtime. No Realtime is
used anywhere today; this is additive. Polling keeps working until you switch.

---

## 10. Strip LLM from Vercel (the payoff)

Once §6 + the worker land: the Next app calls **no** LLM. You can **remove** `OPENAI_API_KEY` /
`ANTHROPIC_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` from Vercel env, and the `ai` / `@ai-sdk/*`
deps stop shipping in the Vercel bundle (they move to the worker package). LLM keys live **only**
on the worker. Smaller surface, simpler rotation.

---

## 11. Code organization (confirm with user — §14)

- **Lightest:** a `worker/` dir in this repo importing the shared `src/lib/*`. Fastest, one repo.
  **Gotcha:** the `@/*` tsconfig path alias must resolve in a non-Next process — use `tsx` +
  tsconfig-paths, `vite-node`, or a small `tsc`/`esbuild` build.
- **Cleaner long-term:** a **monorepo** — `packages/scraper`, `packages/extractor` (the pure,
  offerable cores), `packages/persistence` (or fold into orchestrator), `apps/web` (Next),
  `apps/worker` (orchestrator). This is the structure that makes "split into two services later"
  trivial. More upfront work.
- **One process now, two services later:** whichever layout, the orchestrator imports scraper +
  extractor and runs them in-process initially. Don't stand up two deployables until there's a
  reason (offering the extractor; independent scaling/availability).
- **Docker:** the worker image needs Node 20+, the env vars (§12), outbound network. **No exposed ports.**

---

## 12. Env / secrets

Worker needs: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` (**service role — full DB access,
keep off any public surface**), and the **LLM keys** (`OPENAI_API_KEY`, optionally
`ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, plus `LLM_PROVIDER`/`LLM_MODEL`).
`NEXT_PUBLIC_TVDB_API_KEY` only if you build discovery/enrichment. Names are in `.env.local`.
After §10, the LLM keys are **removed from Vercel** and live only here. Node 20+. Don't use the
anon key for writes.

---

## 13. What to retire once the worker is live

- `src/contexts/RTPImportContext.tsx` (`RTPImportProvider`) + its mount in `src/app/layout.tsx`.
- `src/app/api/rtp-import/step/route.ts` (the worker steps now).
- The client-side LLM call in `src/utils/phraseExtractionFlow.ts` / `phraseExtractionApi.ts`
  (manual upload is a job now).
- Change `src/app/api/rtp-import/start/route.ts` → enqueue-only (`queued`), don't drive; add the
  manual-upload enqueue endpoint.
- After §10, delete LLM usage from `src/app/api/extract-phrases/route.ts` (or remove the route).

**Keep:** the `extraction_jobs` model, the extractor/scraper/persistence libs, `ImportProgressPanel`
+ `useShowImportJob` (switch polling→Realtime), `JobStatusBanner`, the cancel endpoint
`POST /api/extraction-jobs {action:'cancel'}`, and the season-tab series UI.

---

## 14. Decisions to confirm with the user before building

1. **Code layout:** `worker/` dir in this repo vs monorepo with `packages/{scraper,extractor}`.
2. **Docker or bare process.**
3. **Queue tier:** jobs-table vs pgmq.
4. **Concurrency + rate limits** (depends on their LLM plan + RTP politeness).
5. **Single or multiple workers** (decides atomic-claim requirement).
6. **Realtime now or later.**
7. **Manual-upload UX:** async-only via worker, or keep a synchronous fallback when the worker is off
   (two paths — only if they miss the instant flow).
8. **How far to split deployment now:** one process (recommended) vs already two services.

---

## 15. Suggested phasing

- **Phase 0 (refactor seams):** §6a extractor+persistence split; §6b `processEpisode` → orchestration
  (no HTTP); verify the Next flows still work.
- **Phase 1 (worker MVP):** orchestrator process, single concurrency, polls `extraction_jobs`,
  handles `rtp_series`; `/start` → enqueue-only; retire the client driver.
- **Phase 2 (manual upload as a job):** §6c enqueue endpoint + worker handling of `manual_upload`;
  remove LLM from Vercel (§10).
- **Phase 3 (robust):** concurrency + rate limits, retries/backoff, stale reclaim, graceful
  shutdown, a heartbeat (`worker_status` row) so the UI can show "worker online."
- **Phase 4:** Realtime progress.
- **Phase 5 (optional):** catalog auto-discovery cron (closes the RTP enumeration gap; `src/lib/tvdb.ts`
  for enrichment). And/or split scraper+extractor into two deployed services if a reason appears.

---

## 16. Verification

Run the worker locally against the same Supabase. From the web admin UI, (a) enqueue an RTP import
and (b) upload a single subtitle — both should now just **create a job and return**. Confirm the
**worker** does the work:
- `extraction_jobs.results` fills in **incrementally** (plan → per-episode `episodes` → summary);
- per-episode rows appear in `phrase_extractions` / `extracted_phrases` / `episodes`;
- progress/counts climb; the series-page `ImportProgressPanel` reflects it (admin only);
- **cancel** stops it; **kill the worker mid-job and restart** → it reclaims and resumes (dedup skips done work);
- after §10, Vercel has **no** LLM keys and imports/uploads still complete.

The exact per-episode write semantics to copy live in `src/app/api/rtp-import/step/route.ts` and
`src/lib/rtp-import/process-episode.ts`. Read them before writing the worker loop.

---

## 17. Guardrails

- **Keep scraper & extractor pure** (no Supabase, no Next) — that purity is what makes them
  reusable and lets you split into separate services later. All state lives in the orchestrator.
- Design the scraper↔extractor seam as a **serializable contract** (subtitle text + metadata) even
  while it's an in-process call.
- The worker holds the service key + LLM keys — it is fully privileged; never expose it on a network surface.
- Lean on the existing **dedup** so every step is safely re-runnable.
- Don't silently cap work — if you bound concurrency or skip units, log it.
- This is an admin/personal tool with infrequent jobs: favor robustness + clarity over scale.
