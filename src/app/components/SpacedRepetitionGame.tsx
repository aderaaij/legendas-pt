"use client";

import { useState, useEffect, useCallback } from "react";
import { X, RotateCcw, Trophy, Brain } from "lucide-react";
import { StudyCard } from "./StudyCard";
import { StudyProgressBar } from "./StudyProgressBar";
import { studyService } from "@/lib/study-service";
import {
  StudyCard as StudyCardType,
  StudyRating,
  StudySession,
} from "@/types/spaced-repetition";
import { useAuth } from "@/hooks/useAuth";

interface SpacedRepetitionGameProps {
  episodeId: string;
  episodeTitle: string;
  onClose: () => void;
}

export function SpacedRepetitionGame({
  episodeId,
  episodeTitle,
  onClose,
}: SpacedRepetitionGameProps) {
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

  const handleRestart = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setGameComplete(false);
    setSessionStats({
      studied: 0,
      correct: 0,
      startTime: Date.now(),
    });
    initializeGame();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading study cards...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <Brain className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Cards Available
            </h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              <button
                onClick={initializeGame}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameComplete) {
    const accuracy =
      sessionStats.studied > 0
        ? (sessionStats.correct / sessionStats.studied) * 100
        : 0;
    const duration = Math.floor((Date.now() - sessionStats.startTime) / 1000);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-green-500 mb-4">
              <Trophy className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Study Session Complete!
            </h3>
            <p className="text-gray-600 mb-6">
              Great work on studying {episodeTitle}
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {sessionStats.studied}
                  </div>
                  <div className="text-sm text-gray-600">Cards Studied</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {accuracy.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Accuracy</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.floor(duration / 60)}m
                  </div>
                  <div className="text-sm text-gray-600">Duration</div>
                </div>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Sign in to save your progress!</strong> Your study
                  data will be saved and you&apos;ll get better spaced
                  repetition scheduling.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleRestart}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Study Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];
  if (!currentCard) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Study Session
            </h2>
            <p className="text-sm text-gray-600">{episodeTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <StudyProgressBar
          currentCard={currentCardIndex + 1}
          totalCards={cards.length}
          correctCards={sessionStats.correct}
          studiedCards={sessionStats.studied}
        />

        {/* Study card */}
        <div className="p-4">
          <StudyCard
            card={currentCard}
            onResponse={handleResponse}
            showAnswer={showAnswer}
            onFlip={handleFlip}
            cardNumber={currentCardIndex + 1}
            totalCards={cards.length}
          />
        </div>

        {/* Footer with auth reminder */}
        {!isAuthenticated && (
          <div className="bg-blue-50 border-t border-blue-200 p-3">
            <p className="text-xs text-blue-700 text-center">
              Sign in to save your progress and get personalized spaced
              repetition scheduling
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
