// Database schema types for Supabase tables.

export interface Show {
  id: string;
  name: string;
  source: string;
  description?: string;
  genre?: string;
  language?: string;
  watch_url?: string;
  // TVDB fields
  tvdb_id?: number;
  tvdb_slug?: string;
  overview?: string;
  first_aired?: string;
  network?: string;
  status?: string;
  poster_url?: string;
  genres?: string[];
  rating?: number;
  tvdb_confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: string;
  show_id: string;
  season?: number;
  episode_number?: number;
  title?: string;
  air_date?: string;
  duration_minutes?: number;
  description?: string;
  // TVDB fields
  tvdb_id?: number;
  overview?: string;
  aired?: string;
  runtime?: number;
  episode_image?: string;
  created_at: string;
  updated_at: string;
}

export interface PhraseExtraction {
  id: string;
  content_hash: string;
  content_preview?: string;
  content_length: number;
  show_id?: string;
  episode_id?: string;
  source: string;
  capture_timestamp: string;
  language: string;
  max_phrases: number;
  total_phrases_found: number;
  was_truncated: boolean;
  extraction_params?: Record<string, any>;
  processing_time_ms?: number;
  api_cost_estimate?: number;
  created_at: string;
  updated_at: string;
}

export interface ExtractedPhrase {
  id: string;
  extraction_id: string;
  phrase: string;
  translation: string;
  context?: string;
  confidence_score?: number;
  position_in_content?: number;
  start_time?: string;
  end_time?: string;
  speaker?: string;
  matched_confidence?: number;
  created_at: string;
}

export interface ExtractionJob {
  id: string;
  user_id: string;
  job_type: "rtp_series" | "manual_upload";
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number; // 0-100
  total_episodes: number;
  completed_episodes: number;
  failed_episodes: number;
  series_title?: string;
  series_url?: string;
  current_episode?: string;
  error_message?: string;
  results?: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// A show enriched with both extraction stats and full show metadata, used by
// the CENA library/home view (hero blurb, genres, year, etc).
export interface LibraryShow {
  id: string;
  name: string;
  source: string;
  extractionCount: number;
  totalPhrases: number;
  lastExtraction: string;
  network?: string;
  rating?: number;
  poster_url?: string;
  tvdb_confidence?: number;
  // enriched from the full show record
  overview?: string;
  description?: string;
  first_aired?: string;
  genre?: string;
  genres?: string[];
  status?: string;
  watch_url?: string;
}
