-- Create extraction_jobs table for tracking background processing
CREATE TABLE IF NOT EXISTS extraction_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('rtp_series', 'manual_upload')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  total_episodes INTEGER NOT NULL DEFAULT 0,
  completed_episodes INTEGER NOT NULL DEFAULT 0,
  failed_episodes INTEGER NOT NULL DEFAULT 0,
  series_title TEXT,
  series_url TEXT,
  current_episode TEXT,
  error_message TEXT,
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_user_id ON extraction_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_status ON extraction_jobs(status);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_created_at ON extraction_jobs(created_at DESC);

-- Create RLS policies
ALTER TABLE extraction_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users can view their own extraction jobs" ON extraction_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only create their own jobs
CREATE POLICY "Users can create their own extraction jobs" ON extraction_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own jobs
CREATE POLICY "Users can update their own extraction jobs" ON extraction_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own jobs
CREATE POLICY "Users can delete their own extraction jobs" ON extraction_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_extraction_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER extraction_jobs_updated_at
  BEFORE UPDATE ON extraction_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_extraction_jobs_updated_at();