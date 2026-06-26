# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LegendasPT is a Portuguese language learning application that extracts useful phrases from subtitle files (.vtt/.srt) and translates them to English using OpenAI's API. The application features role-based authentication where users can browse and favorite phrases, while admins can upload subtitles, extract phrases, and manage content. All phrases can be exported to Anki for spaced repetition learning.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run the data-plane worker (all scraping + LLM extraction; see below)
npm run worker          # one-off; npm run worker:watch to auto-reload
```

Development server runs on http://localhost:3000

## Worker / Data Plane Architecture

All heavy work (subtitle scraping + LLM phrase extraction) runs in a **persistent
worker**, not on Vercel. The Next.js app is the **control plane**: it handles UI,
auth, reads, and **enqueues jobs**; it holds **no LLM keys** and does no LLM work.
The two planes communicate only through Supabase.

```
Vercel (Next.js)  ──enqueue jobs──▶  Supabase (extraction_jobs)  ◀──claim+process──  Worker
   UI · auth · reads                  DB · Auth · Realtime              scrape + extract + persist
```

- **`worker/`** — the orchestrator (a Node/TypeScript process run via `tsx`; the
  `@/*` alias resolves from `tsconfig.json`, no build step). Outbound-only, no
  exposed ports. Claims jobs, runs the pipeline, owns **all** job-state writes.
  Reuses the shared, framework-free libs: `@/lib/extractor` (subtitle → phrases,
  the pure LLM core), `@/lib/rtp-scraper`, `@/lib/db/extractions`
  (`persistExtraction`). See `worker/README.md`.
- **Job types** (`extraction_jobs.job_type`): `rtp_series` (worker scrapes each
  episode) and `manual_upload` (browser POSTs the file content to
  `/api/manual-upload/start`, which embeds it in the job; the worker extracts it —
  no scraper). Both enqueue with `status='queued'`; the worker claims
  `queued → running`.
- **Robustness:** atomic claim (safe to run multiple workers), a per-job
  heartbeat + stale-reclaim (a crashed worker's job auto-resumes; dedup makes
  re-processing safe), per-unit retries with backoff, graceful shutdown, and a
  `worker_status` liveness row surfaced as a "worker online" badge on `/upload`.
- **Progress** reaches the UI via **Supabase Realtime** on `extraction_jobs`
  (`useExtractionJobs` subscribes; a slow poll is the backstop).
- **Enqueue endpoints:** `POST /api/rtp-import/start`, `POST /api/manual-upload/start`
  (both admin-only, enqueue-only). There is **no** `/api/extract-phrases` route
  anymore — extraction is the worker's job.

**Run it:** `cp .env.worker.example .env.worker` (fill in Supabase + LLM keys,
`chmod 600`), then `npm run worker` — or `docker compose up -d --build` (the
worker-only `docker-compose.yml`). The worker needs `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, and at least one LLM key.

**Required DB migrations** (in `database/`, idempotent — apply with `psql`):
`extraction_jobs_table.sql`, `add_queued_status.sql`, `worker_status_table.sql`,
`enable_realtime_extraction_jobs.sql`.

After this split, the LLM keys (`OPENAI_API_KEY`, etc.) live **only** on the
worker and should be **removed from the Vercel env**; the `ai`/`@ai-sdk/*` SDK no
longer ships in the Vercel bundle.

## Admin Setup

For first-time deployment, you'll need to manually promote a user to admin status:

1. Create a user account through the application
2. Run the following SQL query in your Supabase SQL editor:
```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE user_id = 'your-user-id-here';
```

See `AUTHENTICATION_SETUP.md` for detailed authentication setup instructions.

## Backups & Disaster Recovery

All application data lives **only** in Supabase — there is no other persistence
layer. The project has run on the Supabase free tier, where a project can be
**paused/terminated after inactivity**; when that happens Supabase provides
downloadable backups (a `db_cluster-*.backup.gz` SQL dump and a `*.storage.zip`).
This happened once (June 2026) and the project was restored to a **new** project.

To restore a `db_cluster` backup into a brand-new Supabase project:

1. Create a fresh project (save the DB password; leave the public schema empty).
2. Generate a clean, conflict-free restore file (do **not** run the raw cluster
   dump — it recreates Supabase's managed roles/schemas and fails):
   ```bash
   gunzip -c ~/Downloads/db_cluster-*.backup.gz > db_cluster.sql
   python3 scripts/restore-from-cluster-dump.py db_cluster.sql restore.sql
   ```
3. Load it with `psql` (the SQL editor can't stream `COPY`; install via
   `brew install libpq`):
   ```bash
   psql "postgresql://postgres:[PW]@db.[NEW-REF].supabase.co:5432/postgres" \
        -v ON_ERROR_STOP=1 -f restore.sql
   ```
4. Update `.env.local` with the new project's `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (use the **publishable**/anon key, never the
   secret/service_role key), then restart `npm run dev`.

What the generator handles (see the script header for details): keeps the whole
`public` schema + data, preserves `auth.users`/`auth.identities` so existing
logins and user-linked data (study progress, favorites) survive with the same
UUIDs, drops `ALTER DEFAULT PRIVILEGES FOR ROLE` blocks (non-superuser `postgres`
can't run them), and re-creates the `auth.users` signup trigger after `COMMIT`.
The `*.storage.zip` backup only matters if Storage buckets were used (they were
empty here — the app stores image URLs, not uploaded files).

## Architecture Overview

### Tech Stack
- **Next.js 15.3.3** with App Router and React 19
- **TypeScript** for type safety
- **Supabase** for PostgreSQL database, authentication, and Row Level Security
- **OpenAI API** (GPT-4o-mini) for phrase extraction and translation
- **The TVDB API** for TV show metadata enrichment
- **Tailwind CSS 4** for styling

### Key Components Structure
- `SubtitleUploader` - Handles file upload and metadata detection
- `PhraseExtractor` - Orchestrates AI-powered phrase extraction workflow  
- `PhraseEditor` - Manages editing and display of extracted phrases
- `AnkiExporter` - Exports phrases to Anki flashcard format
- `MetadataEditor` - Handles show/episode metadata management
- `AuthModal` - Authentication modal for login/signup
- `Navigation` - App navigation with authentication status and admin controls
- `ProtectedRoute` - Route protection wrapper with `AdminRoute` and `AuthenticatedRoute` variants
- `FavoriteButton` - User favorite functionality for phrases
- `SpacedRepetitionGame` - Interactive study interface with FSRS algorithm for optimal learning
- `StudyCard` - Individual flashcard component for spaced repetition
- `StudyProgressBar` - Progress tracking during study sessions

### Database Schema (Supabase)
```sql
shows - TV show metadata with TVDB enrichment
episodes - Episode information  
phrase_extractions - Extraction sessions with processing metadata
extracted_phrases - Individual phrases with Portuguese/English translations
user_profiles - User profile management with role assignment (user/admin)
user_favorites - User phrase favorites
user_study_sessions - Spaced repetition study session tracking
user_card_studies - Individual card progress with FSRS algorithm data (includes study_direction: 'pt-en' | 'en-pt')
```

**Key Database Changes (Dec 2024):**
- Added `study_direction` column to `user_card_studies` for direction-specific progress tracking
- Updated `get_due_cards_for_user()` database function to filter by study direction
- Compound unique constraint on `(user_id, phrase_id, study_direction)` to prevent duplicates
- Proper UUID/TEXT type handling in database functions

### Authentication System
The application implements a **role-based authentication system** with two user roles:
- **Users**: Can browse content, view phrases, and favorite phrases
- **Admins**: Can upload subtitles, extract phrases, edit content, and manage all data

**Authentication Features:**
- Email-based authentication with email confirmation
- Automatic user profile creation
- Database-level security with Row Level Security (RLS)
- Route protection for admin-only features
- User-specific favorites functionality

### API Integration Pattern
The application uses a service layer pattern:
- `PhraseExtractionService` - Central data access layer for database operations
- `TVDBService` - External API integration for show metadata
- `StudyService` - Spaced repetition management with direction-specific FSRS algorithm integration
- OpenAI API calls are made directly from components/hooks

**StudyService Key Methods:**
- `getDueCards(episodeId, studyDirection, limit)` - Fetch direction-specific due cards
- `processStudyResponse(phraseId, rating, studyDirection, responseTime)` - Update FSRS progress per direction

### Core Workflow
1. Upload subtitle file → Auto-detect metadata → Parse content
2. Check for existing extraction (SHA-256 deduplication) 
3. Call OpenAI API for phrase extraction → Enrich with TVDB metadata
4. Save to database → Display with export options

### Content Processing
- Subtitle parsing supports .vtt and .srt formats
- Automatic filename parsing (e.g., "Show.Name.S01E01.vtt")
- Content deduplication using SHA-256 hashing
- Show name normalization for matching across extractions

### Spaced Repetition Learning System
The application includes an advanced spaced repetition system for optimal language learning:

**Core Features:**
- **FSRS Algorithm** - Uses `ts-fsrs` library for scientifically-optimized scheduling
- **Direction-Specific Learning** - Separate progress tracking for Portuguese→English (recognition) and English→Portuguese (production)
- **Bidirectional Study Interface** - Toggle between study directions with visual indicators (🇵🇹→🇬🇧 / 🇬🇧→🇵🇹)
- **Anki-style Interface** - 4-button rating system with flip animation
- **Progress Tracking** - Persistent learning progress for authenticated users per direction
- **Guest Mode** - Temporary study sessions for non-authenticated users
- **Keyboard Shortcuts** - Space to flip, 1-4 for ratings, R to toggle direction, Escape to close
- **Favorite Integration** - Heart button to favorite phrases during study sessions

**Pedagogical Design:**
- **Recognition vs Production** - Portuguese→English (easier, receptive learning) and English→Portuguese (harder, productive learning) tracked separately
- **Independent FSRS Scheduling** - Each direction has its own optimized spaced repetition intervals based on difficulty
- **Scientific Accuracy** - Aligns with language learning research showing different cognitive pathways for recognition and production

**Learning States:**
- **New**: Cards being learned for the first time
- **Learning**: Cards in initial learning phase
- **Review**: Cards scheduled for periodic review
- **Relearning**: Previously learned cards that were forgotten

**User Experience:**
- Study sessions accessible via "Start Study" button on episode pages
- Real-time progress tracking with accuracy and timing statistics per direction
- Direction toggle automatically restarts session with fresh cards
- Intelligent scheduling based on individual memory patterns per cognitive skill
- Seamless integration with existing authentication and favorites systems

## Environment Variables Required

> **Note:** the LLM keys below now belong to the **worker** (`.env.worker`), not
> Vercel — see "Worker / Data Plane Architecture" above. The Next app does no LLM
> work, so remove them from the Vercel env. The variables below describe the full
> set across both planes.

```bash
# LLM providers — at least the one used as the default must be set (WORKER only).
OPENAI_API_KEY=               # OpenAI key (phrase extraction; default provider)
ANTHROPIC_API_KEY=            # Anthropic Claude key (optional provider)
GOOGLE_GENERATIVE_AI_API_KEY= # Google Gemini key (optional provider)
LLM_PROVIDER=                 # Optional deploy-wide default: openai | anthropic | google (default: openai)
LLM_MODEL=                    # Optional model override for the default provider (blank → provider's default)

NEXT_PUBLIC_SUPABASE_URL= # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anonymous key
SUPABASE_SECRET_KEY=      # Service-role key (server-only). Required for RTP imports:
                          # the import authorizes the admin once, then does all
                          # server work with a service-role client so the long
                          # episode loop doesn't depend on the user's JWT. Helper:
                          # src/lib/supabase-admin.ts. Never expose to the client.
NEXT_PUBLIC_TVDB_API_KEY= # The TVDB API key for show metadata
```

The active provider/model is chosen per extraction in the upload UI (admin), or
falls back to `LLM_PROVIDER`/`LLM_MODEL`, then the built-in defaults in
`src/lib/llm/types.ts`. Selection resolution + model construction live in
`src/lib/llm/providers.ts`.

## File Structure Notes

### Routes
- `/` - Homepage showing library of all shows and episodes (public)
- `/upload/` - Subtitle upload and phrase extraction interface (**admin only**)
- `/[series]/` - Show detail page (e.g., `/breaking-bad`) (public)
- `/[series]/edit/` - Show management and bulk operations (**admin only**)
- `/[series]/[episode]/` - Episode detail page (e.g., `/breaking-bad/s01e01`) (public)
- `/[series]/[episode]/edit/` - Episode management interface (**admin only**)
- `/api/extract-phrases/` - API endpoint for phrase extraction processing

### Directories
- `/src/app/` - Next.js App Router pages and layouts
- `/src/app/components/` - Reusable UI components, grouped by intent: `layout/`,
  `home/`, `study/`, `phrase/`, `common/`, and `ui/` (shared primitives:
  ModalBase, FormField, StatCard). Large components are folders with an
  `index.tsx` orchestrator + a `use*` hook + small presentational parts.
- `/src/contexts/` - React contexts (AuthContext for authentication state)
- `/src/hooks/` - **Cross-cutting** custom hooks only — ones used by multiple
  components across different domains (useAuth, useAuthedFetch, useFavorites,
  useExtractionJobs). A hook bound to a single component is **colocated** next to
  that component (e.g. `components/home/useHomePage.ts`,
  `upload/components/usePhraseExtraction.ts`, `[series]/[episode]/edit/useEpisodeEdit.ts`),
  matching the folder-component pattern where `index.tsx` sits beside its `use*` hook.
  (useShowSelector/useEpisodeSelection stay here pending the ShowSelector reorg.)
- `/src/lib/` - Service layer. `supabase.ts` is a thin barrel: it exports the
  client, re-exports DB types, and assembles the `PhraseExtractionService` facade
  from per-domain modules in `/src/lib/db/*` (shows, episodes, extractions,
  phrases, extraction-jobs, stats, dedup). Also `tvdb.ts`, `rtp-scraper.ts`,
  `study-service.ts`.
- `/src/lib/llm/` - Provider-agnostic LLM layer (Vercel AI SDK). `types.ts`
  (UI-safe: `Provider`, `DEFAULT_MODELS`, `LlmSelection`), `providers.ts`
  (`resolveSelection` = per-request override → `LLM_PROVIDER`/`LLM_MODEL` env →
  default; `getModel` builds the OpenAI/Anthropic/Google model — the only place
  providers are constructed), and `extract-phrases.ts` (first consumer:
  `generateObject` + Zod). Keep this layer **pure** (no Supabase/Next imports) so
  a future subtitle-translation consumer can reuse `providers.ts` unchanged. The
  chosen provider/model is persisted per extraction in `extraction_params`.
- `/src/types/` - TypeScript type definitions (auth.ts, database.ts, phrase.ts)
- `/src/utils/` - Utility functions for content processing and API interactions

## Code instructions
- Try and put hooks and hook related logic into custom hooks 
- Create util files and functions for utility functions
- Separate components logically, i.e. when we map over a list to create a card, this card should be its own component
- Don't forget to clean up. use knip (`npx knip`) to find and evaluate unused imports/exports

## Authentication Development Notes
- Use `ProtectedRoute` components to wrap admin-only pages and functionality
- Check user authentication state with the `useAuth` hook
- Database queries automatically respect RLS policies - no additional permission checks needed in application code
- Always handle loading states during authentication checks
- Admin functionality should be conditionally rendered based on user role