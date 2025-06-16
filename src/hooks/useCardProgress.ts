import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { CardStudy } from '@/types/spaced-repetition';

interface CardProgressData {
  phraseId: string;
  cardStudy: CardStudy | null;
  progressPercentage: number;
  state: 'New' | 'Learning' | 'Review' | 'Relearning';
  isLearned: boolean;
}

export function useCardProgress(phraseIds: string[]) {
  const [progressData, setProgressData] = useState<Map<string, CardProgressData>>(new Map());
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Create a stable string representation for dependency checking
  const phraseIdsString = phraseIds.join(',');

  const calculateProgressPercentage = useCallback((cardStudy: CardStudy | null): number => {
    if (!cardStudy) return 0;
    
    // Calculate progress based on FSRS stability and review count
    // Stability ranges from 0.4 to 10+ (typical values)
    // We'll use a combination of stability and review count
    const stability = cardStudy.stability || 0;
    const reps = cardStudy.reps || 0;
    const lapses = cardStudy.lapses || 0;
    
    // Base progress from stability (0-60%)
    const stabilityProgress = Math.min(stability / 10, 1) * 60;
    
    // Additional progress from successful reviews (0-30%)
    const reviewProgress = Math.min(reps / 10, 1) * 30;
    
    // Penalty for lapses (0-10% reduction)
    const lapsePenalty = Math.min(lapses / 5, 1) * 10;
    
    // State bonus
    const stateBonus = cardStudy.state === 'Review' ? 10 : 
                     cardStudy.state === 'Learning' ? 5 : 0;
    
    const totalProgress = Math.max(0, stabilityProgress + reviewProgress + stateBonus - lapsePenalty);
    return Math.min(100, totalProgress);
  }, []);

  const isCardLearned = useCallback((cardStudy: CardStudy | null): boolean => {
    if (!cardStudy) return false;
    
    // Consider a card "learned" if it's in Review state with good stability
    return cardStudy.state === 'Review' && 
           (cardStudy.stability || 0) >= 2 && 
           (cardStudy.reps || 0) >= 3;
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user || phraseIds.length === 0) {
      setProgressData(new Map());
      return;
    }

    const fetchProgressData = async () => {
      setLoading(true);
      try {
        const { data: cardStudies, error } = await supabase
          .from('user_card_studies')
          .select('*')
          .eq('user_id', user.id)
          .in('phrase_id', phraseIds);

        if (error) {
          console.error('Error fetching card progress:', error);
          return;
        }

        const progressMap = new Map<string, CardProgressData>();
        
        // Initialize all phrases (even those without card studies)
        phraseIds.forEach(phraseId => {
          const cardStudy = cardStudies?.find(cs => cs.phrase_id === phraseId) || null;
          const progressPercentage = calculateProgressPercentage(cardStudy);
          const state = cardStudy?.state || 'New';
          const isLearned = isCardLearned(cardStudy);
          
          progressMap.set(phraseId, {
            phraseId,
            cardStudy,
            progressPercentage,
            state,
            isLearned
          });
        });
        
        setProgressData(progressMap);
      } catch (error) {
        console.error('Error in fetchProgressData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, phraseIdsString]);

  const getProgressForPhrase = (phraseId: string): CardProgressData | null => {
    return progressData.get(phraseId) || null;
  };

  return {
    progressData,
    loading,
    getProgressForPhrase,
    isAuthenticated
  };
}