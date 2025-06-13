-- Database Migration Script for LegendasPT
-- Run these commands in your Supabase SQL Editor

-- =========================================
-- SHOWS TABLE UPDATES
-- =========================================

-- Add missing columns to shows table
ALTER TABLE shows 
ADD COLUMN IF NOT EXISTS tvdb_id INTEGER,
ADD COLUMN IF NOT EXISTS tvdb_slug TEXT,
ADD COLUMN IF NOT EXISTS overview TEXT,
ADD COLUMN IF NOT EXISTS first_aired DATE,
ADD COLUMN IF NOT EXISTS network TEXT,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS poster_url TEXT,
ADD COLUMN IF NOT EXISTS genres TEXT[], -- Array of text for genres
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,1), -- Rating out of 10 with 1 decimal
ADD COLUMN IF NOT EXISTS tvdb_confidence DECIMAL(3,2), -- Confidence score 0.00-1.00
ADD COLUMN IF NOT EXISTS description TEXT, -- Show description
ADD COLUMN IF NOT EXISTS genre TEXT, -- Single genre (legacy)
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt'; -- Language code

-- Add timestamps if they don't exist
ALTER TABLE shows 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to shows table
DROP TRIGGER IF EXISTS update_shows_updated_at ON shows;
CREATE TRIGGER update_shows_updated_at
BEFORE UPDATE ON shows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint for TVDB ID (optional but recommended)
ALTER TABLE shows 
ADD CONSTRAINT unique_tvdb_id UNIQUE (tvdb_id);

-- =========================================
-- EPISODES TABLE UPDATES
-- =========================================

-- Add missing columns to episodes table
ALTER TABLE episodes
ADD COLUMN IF NOT EXISTS season INTEGER,
ADD COLUMN IF NOT EXISTS episode_number INTEGER,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS air_date DATE,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tvdb_id INTEGER,
ADD COLUMN IF NOT EXISTS overview TEXT,
ADD COLUMN IF NOT EXISTS aired DATE,
ADD COLUMN IF NOT EXISTS runtime INTEGER,
ADD COLUMN IF NOT EXISTS episode_image TEXT;

-- Add timestamps if they don't exist
ALTER TABLE episodes
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Apply the trigger to episodes table
DROP TRIGGER IF EXISTS update_episodes_updated_at ON episodes;
CREATE TRIGGER update_episodes_updated_at
    BEFORE UPDATE ON episodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint for season/episode per show
ALTER TABLE episodes 
ADD CONSTRAINT unique_show_season_episode 
UNIQUE (show_id, season, episode_number);

-- Add unique constraint for TVDB episode ID
ALTER TABLE episodes 
ADD CONSTRAINT unique_episode_tvdb_id UNIQUE (tvdb_id);

-- =========================================
-- PHRASE_EXTRACTIONS TABLE UPDATES
-- =========================================

-- Add missing columns to phrase_extractions table if needed
ALTER TABLE phrase_extractions
ADD COLUMN IF NOT EXISTS show_id UUID REFERENCES shows(id),
ADD COLUMN IF NOT EXISTS episode_id UUID REFERENCES episodes(id),
ADD COLUMN IF NOT EXISTS content_hash TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS content_preview TEXT,
ADD COLUMN IF NOT EXISTS content_length INTEGER NOT NULL,
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS capture_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt',
ADD COLUMN IF NOT EXISTS max_phrases INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS total_phrases_found INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS was_truncated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS extraction_params JSONB,
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS api_cost_estimate DECIMAL(10,6);

-- Add timestamps if they don't exist
ALTER TABLE phrase_extractions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Apply the trigger to phrase_extractions table
DROP TRIGGER IF EXISTS update_phrase_extractions_updated_at ON phrase_extractions;
CREATE TRIGGER update_phrase_extractions_updated_at
    BEFORE UPDATE ON phrase_extractions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint for content hash
ALTER TABLE phrase_extractions 
ADD CONSTRAINT unique_content_hash UNIQUE (content_hash);

-- =========================================
-- EXTRACTED_PHRASES TABLE UPDATES
-- =========================================

-- Add missing columns to extracted_phrases table if needed
ALTER TABLE extracted_phrases
ADD COLUMN IF NOT EXISTS extraction_id UUID REFERENCES phrase_extractions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS phrase TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS translation TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS context TEXT,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS position_in_content INTEGER;

-- Add timestamps if they don't exist
ALTER TABLE extracted_phrases
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =========================================
-- INDEXES FOR BETTER PERFORMANCE
-- =========================================

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shows_tvdb_id ON shows(tvdb_id);
CREATE INDEX IF NOT EXISTS idx_shows_name ON shows(name);
CREATE INDEX IF NOT EXISTS idx_shows_source ON shows(source);

CREATE INDEX IF NOT EXISTS idx_episodes_show_id ON episodes(show_id);
CREATE INDEX IF NOT EXISTS idx_episodes_tvdb_id ON episodes(tvdb_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season_episode ON episodes(season, episode_number);

CREATE INDEX IF NOT EXISTS idx_phrase_extractions_show_id ON phrase_extractions(show_id);
CREATE INDEX IF NOT EXISTS idx_phrase_extractions_episode_id ON phrase_extractions(episode_id);
CREATE INDEX IF NOT EXISTS idx_phrase_extractions_content_hash ON phrase_extractions(content_hash);

CREATE INDEX IF NOT EXISTS idx_extracted_phrases_extraction_id ON extracted_phrases(extraction_id);
CREATE INDEX IF NOT EXISTS idx_extracted_phrases_phrase ON extracted_phrases USING gin(to_tsvector('portuguese', phrase));
CREATE INDEX IF NOT EXISTS idx_extracted_phrases_translation ON extracted_phrases USING gin(to_tsvector('english', translation));

-- =========================================
-- ROW LEVEL SECURITY (Optional - Uncomment if needed)
-- =========================================

-- Enable RLS on tables (uncomment if you want to add security)
-- ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE phrase_extractions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE extracted_phrases ENABLE ROW LEVEL SECURITY;

-- Create policies (example - adjust as needed)
-- CREATE POLICY "Allow all operations for authenticated users" ON shows
--     FOR ALL USING (auth.role() = 'authenticated');

-- =========================================
-- VERIFICATION QUERIES
-- =========================================

-- Run these to verify the schema is correct:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'shows' 
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'episodes' 
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'phrase_extractions' 
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'extracted_phrases' 
-- ORDER BY ordinal_position;