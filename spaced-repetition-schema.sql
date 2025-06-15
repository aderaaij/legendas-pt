-- Spaced Repetition Database Schema
-- Add these tables to support spaced repetition game functionality

-- =========================================
-- UTILITY FUNCTIONS
-- =========================================

-- Create or replace the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =========================================
-- USER STUDY SESSIONS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS user_study_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL DEFAULT 'mixed', -- 'new', 'review', 'mixed'
    total_cards INTEGER NOT NULL DEFAULT 0,
    cards_studied INTEGER NOT NULL DEFAULT 0,
    cards_correct INTEGER NOT NULL DEFAULT 0,
    session_duration_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- USER CARD STUDIES TABLE (FSRS Data)
-- =========================================
CREATE TABLE IF NOT EXISTS user_card_studies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phrase_id UUID NOT NULL REFERENCES extracted_phrases(id) ON DELETE CASCADE,
    
    -- FSRS Algorithm Fields
    due_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    stability DECIMAL(10,4) NOT NULL DEFAULT 0.0, -- FSRS stability parameter
    difficulty DECIMAL(10,4) NOT NULL DEFAULT 0.0, -- FSRS difficulty parameter
    elapsed_days INTEGER NOT NULL DEFAULT 0,
    scheduled_days INTEGER NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0, -- Number of reviews
    lapses INTEGER NOT NULL DEFAULT 0, -- Number of times forgotten
    state TEXT NOT NULL DEFAULT 'New', -- 'New', 'Learning', 'Review', 'Relearning'
    
    -- Review History
    last_review TIMESTAMP WITH TIME ZONE,
    last_rating INTEGER, -- 1=Again, 2=Hard, 3=Good, 4=Easy
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user per phrase
    UNIQUE(user_id, phrase_id)
);

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================
CREATE INDEX IF NOT EXISTS idx_user_study_sessions_user_id ON user_study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_study_sessions_episode_id ON user_study_sessions(episode_id);
CREATE INDEX IF NOT EXISTS idx_user_study_sessions_created_at ON user_study_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_user_card_studies_user_id ON user_card_studies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_card_studies_phrase_id ON user_card_studies(phrase_id);
CREATE INDEX IF NOT EXISTS idx_user_card_studies_due_date ON user_card_studies(due_date);
CREATE INDEX IF NOT EXISTS idx_user_card_studies_state ON user_card_studies(state);
CREATE INDEX IF NOT EXISTS idx_user_card_studies_last_review ON user_card_studies(last_review);

-- =========================================
-- TRIGGERS FOR UPDATED_AT
-- =========================================
DROP TRIGGER IF EXISTS update_user_study_sessions_updated_at ON user_study_sessions;
CREATE TRIGGER update_user_study_sessions_updated_at
    BEFORE UPDATE ON user_study_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_card_studies_updated_at ON user_card_studies;
CREATE TRIGGER update_user_card_studies_updated_at
    BEFORE UPDATE ON user_card_studies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- ROW LEVEL SECURITY
-- =========================================
ALTER TABLE user_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_card_studies ENABLE ROW LEVEL SECURITY;

-- Users can only access their own study data
CREATE POLICY "Users can view own study sessions" ON user_study_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study sessions" ON user_study_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions" ON user_study_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study sessions" ON user_study_sessions
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own card studies" ON user_card_studies
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card studies" ON user_card_studies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card studies" ON user_card_studies
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own card studies" ON user_card_studies
    FOR DELETE USING (auth.uid() = user_id);

-- =========================================
-- UTILITY FUNCTIONS
-- =========================================

-- Function to get cards due for review for a user
CREATE OR REPLACE FUNCTION get_due_cards_for_user(
    p_user_id UUID,
    p_episode_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    phrase_id UUID,
    phrase TEXT,
    translation TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    state TEXT,
    reps INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ep.id as phrase_id,
        ep.phrase,
        ep.translation,
        COALESCE(ucs.due_date, NOW()) as due_date,
        COALESCE(ucs.state, 'New') as state,
        COALESCE(ucs.reps, 0) as reps
    FROM extracted_phrases ep
    LEFT JOIN user_card_studies ucs ON (ucs.phrase_id = ep.id AND ucs.user_id = p_user_id)
    WHERE 
        (p_episode_id IS NULL OR ep.extraction_id IN (
            SELECT id FROM phrase_extractions WHERE episode_id = p_episode_id
        ))
        AND (ucs.due_date IS NULL OR ucs.due_date <= NOW())
    ORDER BY 
        CASE WHEN ucs.due_date IS NULL THEN 0 ELSE 1 END, -- New cards first
        ucs.due_date ASC NULLS FIRST,
        RANDOM()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;