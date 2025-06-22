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
```

Development server runs on http://localhost:3000

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

```bash
OPENAI_API_KEY=          # OpenAI API key for phrase extraction
NEXT_PUBLIC_SUPABASE_URL= # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anonymous key
NEXT_PUBLIC_TVDB_API_KEY= # The TVDB API key for show metadata
```

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
- `/src/app/components/` - Reusable UI components
- `/src/contexts/` - React contexts (AuthContext for authentication state)
- `/src/hooks/` - Custom hooks for business logic (useHomePage, usePhraseExtraction, useAuth, useFavorites)
- `/src/lib/` - Service layer (supabase.ts, tvdb.ts)
- `/src/types/` - TypeScript type definitions (auth.ts)
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