-- Add timestamp columns to extracted_phrases table
-- Run this script in your Supabase SQL Editor

-- Add timestamp and speaker columns to extracted_phrases table
ALTER TABLE extracted_phrases
ADD COLUMN IF NOT EXISTS start_time TEXT,
ADD COLUMN IF NOT EXISTS end_time TEXT,
ADD COLUMN IF NOT EXISTS speaker TEXT,
ADD COLUMN IF NOT EXISTS matched_confidence DECIMAL(3,2);

-- Create indexes for better performance on timestamp queries
CREATE INDEX IF NOT EXISTS idx_extracted_phrases_start_time ON extracted_phrases(start_time);
CREATE INDEX IF NOT EXISTS idx_extracted_phrases_end_time ON extracted_phrases(end_time);
CREATE INDEX IF NOT EXISTS idx_extracted_phrases_speaker ON extracted_phrases(speaker);

-- Verification query to check the new columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'extracted_phrases' 
  AND column_name IN ('start_time', 'end_time', 'speaker', 'matched_confidence')
ORDER BY column_name;