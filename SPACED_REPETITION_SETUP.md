# Spaced Repetition Game Setup

This document describes the setup and usage of the new spaced repetition game feature in LegendasPT.

## Overview

The spaced repetition game allows users to study Portuguese phrases from episodes using the scientifically-proven FSRS (Free Spaced Repetition Scheduler) algorithm. Users can practice phrases in an Anki-style interface with personalized scheduling.

## Database Setup

Before using the spaced repetition feature, you need to run the database migration:

1. Open your Supabase SQL Editor
2. Execute the SQL script in `spaced-repetition-schema.sql`

This will create the following tables:
- `user_study_sessions` - Track study sessions
- `user_card_studies` - Individual card progress with FSRS data

## Features

### For All Users
- **Anki-style flashcard interface** with Portuguese → English translations
- **4-button rating system**: Again, Hard, Good, Easy
- **Keyboard shortcuts**: Space to flip, 1-4 for ratings, Escape to close
- **Progress tracking** during sessions
- **Session statistics** with accuracy and timing

### For Authenticated Users
- **Persistent progress** saved to database
- **FSRS algorithm** for optimal spaced repetition scheduling
- **Due date tracking** - cards appear when they're due for review
- **Learning states**: New, Learning, Review, Relearning
- **Long-term retention** optimization

### For Guest Users
- **Temporary sessions** without saved progress
- **Prompt to sign in** for better experience
- **Full game functionality** during session

## How It Works

1. **Start Study**: Click the "Start Study" button on any episode page
2. **Study Cards**: View Portuguese phrase, click to reveal English translation
3. **Rate Difficulty**: Choose how well you knew the phrase (Again/Hard/Good/Easy)
4. **FSRS Scheduling**: Algorithm determines when you'll see the card again
5. **Track Progress**: View session statistics and completion

## Components

- `SpacedRepetitionGame`: Main game modal with session management
- `StudyCard`: Individual flashcard component
- `StudyProgressBar`: Progress tracking during sessions
- `StudyService`: Backend service for FSRS algorithm and data management

## Technical Details

- **Algorithm**: Uses `ts-fsrs` package for state-of-the-art spaced repetition
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Integrates with existing Supabase auth system
- **TypeScript**: Fully typed for better development experience

## Usage Tips

- **Study regularly** for best results (daily practice recommended)
- **Be honest with ratings** - this helps the algorithm learn your memory patterns
- **Start with shorter sessions** (10-20 cards) to build consistency
- **Sign in** to get personalized scheduling and progress tracking

## Keyboard Shortcuts

- `Space` - Flip card to reveal answer
- `1` - Rate as "Again" (forgot completely)
- `2` - Rate as "Hard" (difficult to recall)
- `3` - Rate as "Good" (recalled with effort)
- `4` - Rate as "Easy" (easy to recall)
- `Escape` - Close the study session

The spaced repetition feature enhances the learning experience by providing scientifically-optimized review scheduling, helping users retain Portuguese phrases more effectively over time.