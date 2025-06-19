import { useState, useEffect, useCallback } from "react";
import { studyService } from "@/lib/study-service";
import {
  StudyCard as StudyCardType,
  StudyRating,
  StudySession,
} from "@/types/spaced-repetition";
import { useAuth } from "@/hooks/useAuth";

interface UseSpacedRepetitionGameProps {
  episodeId: string;
  onClose: () => void;
}

export function useSpacedRepetitionGame({
  episodeId,
  onClose,
}: UseSpacedRepetitionGameProps) {
  const { isAuthenticated, user } = useAuth();
  const [cards, setCards] = useState<StudyCardType[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [session, setSession] = useState<StudySession | null>(null);
  const [sessionStats, setSessionStats] = useState({
    studied: 0,
    correct: 0,
    startTime: Date.now(),
  });
  const [gameComplete, setGameComplete] = useState(false);

  // Load cards and create session
  const initializeGame = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Get due cards
      const dueCards = await studyService.getDueCards(episodeId, 20);

      if (dueCards.length === 0) {
        setError("No cards available for study at this time.");
        return;
      }

      setCards(dueCards);

      // Create study session if user is authenticated
      if (isAuthenticated && user) {
        const newSession = await studyService.createStudySession(episodeId);
        setSession(newSession);
        await studyService.updateStudySession(newSession.id, {
          total_cards: dueCards.length,
        });
      }
    } catch (err) {
      console.error("Error initializing game:", err);
      setError("Failed to load study cards. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [episodeId, isAuthenticated, user]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleFlip = useCallback(() => {
    setShowAnswer(!showAnswer);
  }, [showAnswer]);

  const handleResponse = useCallback(
    async (rating: StudyRating, responseTime: number) => {
      if (currentCardIndex >= cards.length) return;

      const currentCard = cards[currentCardIndex];

      try {
        // Process the response with spaced repetition algorithm
        if (isAuthenticated) {
          await studyService.processStudyResponse(
            currentCard.phrase.id,
            rating,
            responseTime
          );
        }

        // Update session stats
        const newStats = {
          ...sessionStats,
          studied: sessionStats.studied + 1,
          correct: sessionStats.correct + (rating >= 3 ? 1 : 0),
        };
        setSessionStats(newStats);

        // Update session in database
        if (session) {
          await studyService.updateStudySession(session.id, {
            cards_studied: newStats.studied,
            cards_correct: newStats.correct,
            session_duration_seconds: Math.floor(
              (Date.now() - sessionStats.startTime) / 1000
            ),
          });
        }

        // Move to next card or complete session
        if (currentCardIndex < cards.length - 1) {
          setCurrentCardIndex(currentCardIndex + 1);
          setShowAnswer(false);
        } else {
          // Complete the session
          if (session) {
            await studyService.updateStudySession(session.id, {
              completed_at: new Date().toISOString(),
            });
          }
          setGameComplete(true);
        }
      } catch (err) {
        console.error("Error processing response:", err);
        // Continue with the game even if there's an error
        if (currentCardIndex < cards.length - 1) {
          setCurrentCardIndex(currentCardIndex + 1);
          setShowAnswer(false);
        } else {
          setGameComplete(true);
        }
      }
    },
    [cards, currentCardIndex, session, sessionStats, isAuthenticated]
  );

  const handleRestart = useCallback(() => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setGameComplete(false);
    setSessionStats({
      studied: 0,
      correct: 0,
      startTime: Date.now(),
    });
    initializeGame();
  }, [initializeGame]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (loading || gameComplete) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          handleFlip();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
          if (showAnswer) {
            event.preventDefault();
            handleResponse(parseInt(event.key) as StudyRating, 0);
          }
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [loading, gameComplete, showAnswer, handleFlip, handleResponse, onClose]);

  // Derived values
  const currentCard = cards[currentCardIndex];
  const accuracy =
    sessionStats.studied > 0
      ? (sessionStats.correct / sessionStats.studied) * 100
      : 0;
  const duration = Math.floor((Date.now() - sessionStats.startTime) / 1000);

  return {
    // State
    cards,
    currentCard,
    currentCardIndex,
    showAnswer,
    loading,
    error,
    gameComplete,
    sessionStats,
    isAuthenticated,
    
    // Actions
    handleFlip,
    handleResponse,
    handleRestart,
    initializeGame,
    
    // Computed values
    accuracy,
    duration,
  };
}