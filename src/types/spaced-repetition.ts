import { ExtractedPhrase } from '@/lib/supabase';

export interface StudySession {
  id: string;
  user_id: string;
  episode_id: string;
  session_type: 'new' | 'review' | 'mixed';
  total_cards: number;
  cards_studied: number;
  cards_correct: number;
  session_duration_seconds: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CardStudy {
  id: string;
  user_id: string;
  phrase_id: string;
  due_date: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: 'New' | 'Learning' | 'Review' | 'Relearning';
  last_review?: string;
  last_rating?: 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
  created_at: string;
  updated_at: string;
}

export interface StudyCard {
  phrase: ExtractedPhrase;
  cardStudy?: CardStudy;
  isNew: boolean;
  isDue: boolean;
}

export interface StudyProgress {
  totalCards: number;
  studiedCards: number;
  correctCards: number;
  newCards: number;
  reviewCards: number;
  learningCards: number;
}

export interface StudySettings {
  maxNewCards: number;
  maxReviewCards: number;
  showAnswer: boolean;
  autoAdvance: boolean;
}

export type StudyRating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface StudyResponse {
  rating: StudyRating;
  responseTime: number;
}

export interface DueCard {
  phrase_id: string;
  phrase: string;
  translation: string;
  due_date: string;
  state: string;
  reps: number;
}