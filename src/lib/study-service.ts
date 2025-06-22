import { supabase } from './supabase';
import { FSRS, Card, createEmptyCard, Rating, State, generatorParameters } from 'ts-fsrs';
import {
  StudySession,
  CardStudy,
  StudyCard,
  StudyRating,
  StudyDirection,
  DueCard,
} from '@/types/spaced-repetition';

export class StudyService {
  private fsrs: FSRS;

  constructor() {
    // Initialize FSRS with default parameters
    const params = generatorParameters();
    this.fsrs = new FSRS(params);
  }

  /**
   * Get cards due for study for a specific episode
   */
  async getDueCards(episodeId: string, studyDirection: StudyDirection, limit: number = 20): Promise<StudyCard[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // For guest users, get all phrases from the episode as new cards
      return this.getGuestCards(episodeId, studyDirection, limit);
    }

    // Get due cards using the database function
    const { data: dueCards, error } = await supabase
      .rpc('get_due_cards_for_user', {
        p_user_id: user.id,
        p_episode_id: episodeId,
        p_study_direction: studyDirection,
        p_limit: limit
      }) as { data: DueCard[] | null, error: any };

    if (error) {
      console.error('Error fetching due cards:', error);
      throw error;
    }

    // Convert to StudyCard format - the function now returns all needed data
    const studyCards: StudyCard[] = [];
    
    if (!dueCards?.length) return studyCards;
    
    const phraseIds = dueCards.map(card => card.phrase_id);
    
    // Batch fetch all phrases to get full phrase objects
    const { data: phrases } = await supabase
      .from('extracted_phrases')
      .select('*')
      .in('id', phraseIds);
    
    // Batch fetch card studies for additional metadata if needed
    const { data: cardStudies } = await supabase
      .from('user_card_studies')
      .select('*')
      .eq('user_id', user.id)
      .eq('study_direction', studyDirection)
      .in('phrase_id', phraseIds);
    
    // Create lookup maps for efficient matching
    const phraseMap = new Map((phrases || []).map(p => [p.id, p]));
    const cardStudyMap = new Map((cardStudies || []).map(cs => [cs.phrase_id, cs]));
    
    // Build study cards using data from the database function
    for (const card of dueCards) {
      const phrase = phraseMap.get(card.phrase_id);
      if (phrase) {
        const cardStudy = cardStudyMap.get(card.phrase_id);
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
  private async getGuestCards(episodeId: string, studyDirection: StudyDirection, limit: number): Promise<StudyCard[]> {
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
    studyDirection: StudyDirection,
    _responseTime: number
  ): Promise<CardStudy | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Guest users don't have persistent progress
      return null;
    }

    // Get existing card study or create new one (avoiding .single() to prevent PGRST116 errors)
    const { data: existingStudies } = await supabase
      .from('user_card_studies')
      .select('*')
      .eq('user_id', user.id)
      .eq('phrase_id', phraseId)
      .eq('study_direction', studyDirection)
      .limit(1);
    
    const existingStudy = existingStudies?.[0] || null;

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
        learning_steps: 0,
      };
    } else {
      fsrsCard = createEmptyCard();
    }

    // Process the rating with FSRS
    const now = new Date();
    const schedulingCards = this.fsrs.repeat(fsrsCard, now);
    
    // Get the appropriate card based on rating (using numeric keys 1-4)
    const ratingKey = rating.toString() as '1' | '2' | '3' | '4';
    const updatedCard = schedulingCards[ratingKey].card;

    // Prepare the updated study data
    const updatedStudy: Partial<CardStudy> = {
      user_id: user.id,
      phrase_id: phraseId,
      study_direction: studyDirection,
      due_date: updatedCard.due.toISOString(),
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
      elapsed_days: updatedCard.elapsed_days,
      scheduled_days: updatedCard.scheduled_days,
      reps: updatedCard.reps,
      lapses: updatedCard.lapses,
      state: this.mapStateFromFSRS(updatedCard.state) as 'New' | 'Learning' | 'Review' | 'Relearning',
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