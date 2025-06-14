# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LegendasPT is a Portuguese language learning application that extracts useful phrases from subtitle files (.vtt/.srt) and translates them to English using OpenAI's API. Users can upload subtitles, extract meaningful phrases, and export them to Anki for spaced repetition learning.

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

## Architecture Overview

### Tech Stack
- **Next.js 15.3.3** with App Router and React 19
- **TypeScript** for type safety
- **Supabase** for PostgreSQL database and authentication
- **OpenAI API** (GPT-4o-mini) for phrase extraction and translation
- **The TVDB API** for TV show metadata enrichment
- **Tailwind CSS 4** for styling

### Key Components Structure
- `SubtitleUploader` - Handles file upload and metadata detection
- `PhraseExtractor` - Orchestrates AI-powered phrase extraction workflow  
- `PhraseEditor` - Manages editing and display of extracted phrases
- `AnkiExporter` - Exports phrases to Anki flashcard format
- `MetadataEditor` - Handles show/episode metadata management

### Database Schema (Supabase)
```sql
shows - TV show metadata with TVDB enrichment
episodes - Episode information  
phrase_extractions - Extraction sessions with processing metadata
extracted_phrases - Individual phrases with Portuguese/English translations
```

### API Integration Pattern
The application uses a service layer pattern:
- `PhraseExtractionService` - Central data access layer for database operations
- `TVDBService` - External API integration for show metadata
- OpenAI API calls are made directly from components/hooks

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

## Environment Variables Required

```bash
OPENAI_API_KEY=          # OpenAI API key for phrase extraction
NEXT_PUBLIC_SUPABASE_URL= # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anonymous key
NEXT_PUBLIC_TVDB_API_KEY= # The TVDB API key for show metadata
```

## File Structure Notes

### Routes
- `/` - Homepage showing library of all shows and episodes
- `/upload/` - Subtitle upload and phrase extraction interface
- `/[series]/` - Show detail page (e.g., `/breaking-bad`)
- `/[series]/edit/` - Show management and bulk operations
- `/[series]/[episode]/` - Episode detail page (e.g., `/breaking-bad/s01e01`)
- `/[series]/[episode]/edit/` - Episode management interface
- `/api/extract-phrases/` - API endpoint for phrase extraction processing

### Directories
- `/src/app/` - Next.js App Router pages and layouts
- `/src/app/components/` - Reusable UI components
- `/src/hooks/` - Custom hooks for business logic (useHomePage, usePhraseExtraction)
- `/src/lib/` - Service layer (supabase.ts, tvdb.ts)
- `/src/utils/` - Utility functions for content processing and API interactions

## Code instructions
- Try and put hooks and hook related logic into custom hooks 
- Create util files and functions for utility functions
- Separate components logically, i.e. when we map over a list to create a card, this card should be its own component
- Don't forget to clean up. use knip (`npx knip`) to find and evaluate unused imports/exports