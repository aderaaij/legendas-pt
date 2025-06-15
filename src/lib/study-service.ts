import { supabase } from './supabase';
import { FSRS, Card, createEmptyCard, Rating, State } from 'ts-fsrs';
import {
  StudySession,
  CardStudy,
  StudyCard,
  StudyRating,
} from '@/types/spaced-repetition';

export class StudyService {
  private fsrs: FSRS;

  constructor() {
    // Initialize FSRS with default parameters
    this.fsrs = new FSRS();
  }

  /**
   * Get cards due for study for a specific episode
   */
  async getDueCards(episodeId: string, limit: number = 20): Promise<StudyCard[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // For guest users, get all phrases from the episode as new cards
      return this.getGuestCards(episodeId, limit);
    }

    // Get due cards using the database function
    const { data: dueCards, error } = await supabase
      .rpc('get_due_cards_for_user', {
        p_user_id: user.id,
        p_episode_id: episodeId,
        p_limit: limit
      });

    if (error) {
      console.error('Error fetching due cards:', error);
      throw error;
    }

    // Convert to StudyCard format
    const studyCards: StudyCard[] = [];
    for (const card of dueCards || []) {
      // Get full phrase data
      const { data: phrase } = await supabase
        .from('extracted_phrases')
        .select('*')
        .eq('id', card.phrase_id)
        .single();

      if (phrase) {
        // Get existing card study data if any
        const { data: cardStudy } = await supabase
          .from('user_card_studies')
          .select('*')
          .eq('user_id', user.id)
          .eq('phrase_id', card.phrase_id)
          .single();

        studyCards.push({
          phrase,
          cardStudy: cardStudy || undefined,
          isNew: card.state === 'New',
          isDue: new Date(card.due_date) <= new Date(),
        });
      }
    }

    return studyCards;
  }

  /**
   * Get cards for guest users (no progress tracking)
   */
  private async getGuestCards(episodeId: string, limit: number): Promise<StudyCard[]> {
    // Get phrases for this episode
    const { data: extractions } = await supabase
      .from('phrase_extractions')
      .select('id')
      .eq('episode_id', episodeId);

    if (!extractions?.length) return [];

    const { data: phrases } = await supabase
      .from('extracted_phrases')
      .select('*')
      .in('extraction_id', extractions.map(e => e.id))
      .limit(limit);

    return (phrases || []).map(phrase => ({
      phrase,
      isNew: true,
      isDue: true,
    }));
  }

  /**
   * Process a study response and update card data
   */
  async processStudyResponse(
    phraseId: string,
    rating: StudyRating,
    _responseTime: number
  ): Promise<CardStudy | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Guest users don't have persistent progress
      return null;
    }

    // Get existing card study or create new one
    const { data: existingStudy } = await supabase
      .from('user_card_studies')
      .select('*')
      .eq('user_id', user.id)
      .eq('phrase_id', phraseId)
      .single();

    // Convert existing study to FSRS Card format
    let fsrsCard: Card;
    if (existingStudy) {
      fsrsCard = {
        due: new Date(existingStudy.due_date),
        stability: existingStudy.stability,
        difficulty: existingStudy.difficulty,
        elapsed_days: existingStudy.elapsed_days,
        scheduled_days: existingStudy.scheduled_days,
        reps: existingStudy.reps,
        lapses: existingStudy.lapses,
        state: this.mapStateToFSRS(existingStudy.state),
        last_review: existingStudy.last_review ? new Date(existingStudy.last_review) : undefined,
      };
    } else {
      fsrsCard = createEmptyCard();
    }

    // Process the rating with FSRS
    const now = new Date();
    const fsrsRating = this.mapRatingToFSRS(rating);
    const schedulingCards = this.fsrs.repeat(fsrsCard, now);
    const updatedCard = schedulingCards[fsrsRating].card;

    // Prepare the updated study data
    const updatedStudy: Partial<CardStudy> = {
      user_id: user.id,
      phrase_id: phraseId,
      due_date: updatedCard.due.toISOString(),
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
      elapsed_days: updatedCard.elapsed_days,
      scheduled_days: updatedCard.scheduled_days,
      reps: updatedCard.reps,
      lapses: updatedCard.lapses,
      state: this.mapStateFromFSRS(updatedCard.state),
      last_review: now.toISOString(),
      last_rating: rating,
    };

    // Update or insert the card study
    const { data: savedStudy, error } = await supabase
      .from('user_card_studies')
      .upsert(updatedStudy)
      .select()
      .single();

    if (error) {
      console.error('Error saving card study:', error);
      throw error;
    }

    return savedStudy;
  }

  /**
   * Create a new study session
   */
  async createStudySession(episodeId: string): Promise<StudySession> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create study sessions');
    }

    const { data: session, error } = await supabase
      .from('user_study_sessions')
      .insert({
        user_id: user.id,
        episode_id: episodeId,
        session_type: 'mixed',
        total_cards: 0,
        cards_studied: 0,
        cards_correct: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating study session:', error);
      throw error;
    }

    return session;
  }

  /**
   * Update study session progress
   */
  async updateStudySession(
    sessionId: string,
    updates: Partial<StudySession>
  ): Promise<StudySession> {
    const { data: session, error } = await supabase
      .from('user_study_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating study session:', error);
      throw error;
    }

    return session;
  }

  /**
   * Get study statistics for a user
   */
  async getStudyStats(userId: string, episodeId?: string) {
    let query = supabase
      .from('user_card_studies')
      .select('state, reps, lapses')
      .eq('user_id', userId);

    if (episodeId) {
      // Filter by episode - need to join through phrase_extractions
      const { data: extractions } = await supabase
        .from('phrase_extractions')
        .select('id')
        .eq('episode_id', episodeId);

      if (extractions?.length) {
        const { data: phraseIds } = await supabase
          .from('extracted_phrases')
          .select('id')
          .in('extraction_id', extractions.map(e => e.id));

        if (phraseIds?.length) {
          query = query.in('phrase_id', phraseIds.map(p => p.id));
        }
      }
    }

    const { data: cards } = await query;

    const stats = {
      total: cards?.length || 0,
      new: cards?.filter(c => c.state === 'New').length || 0,
      learning: cards?.filter(c => c.state === 'Learning').length || 0,
      review: cards?.filter(c => c.state === 'Review').length || 0,
      relearning: cards?.filter(c => c.state === 'Relearning').length || 0,
      totalReviews: cards?.reduce((sum, c) => sum + c.reps, 0) || 0,
      totalLapses: cards?.reduce((sum, c) => sum + c.lapses, 0) || 0,
    };

    return stats;
  }

  /**
   * Helper methods for FSRS conversion
   */
  private mapRatingToFSRS(rating: StudyRating): Rating {
    switch (rating) {
      case 1: return Rating.Again;
      case 2: return Rating.Hard;
      case 3: return Rating.Good;
      case 4: return Rating.Easy;
      default: return Rating.Good;
    }
  }

  private mapStateToFSRS(state: string): State {
    switch (state) {
      case 'New': return State.New;
      case 'Learning': return State.Learning;
      case 'Review': return State.Review;
      case 'Relearning': return State.Relearning;
      default: return State.New;
    }
  }

  private mapStateFromFSRS(state: State): string {
    switch (state) {
      case State.New: return 'New';
      case State.Learning: return 'Learning';
      case State.Review: return 'Review';
      case State.Relearning: return 'Relearning';
      default: return 'New';
    }
  }
}

export const studyService = new StudyService();