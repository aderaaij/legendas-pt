"use client";

import { RotateCcw, Trophy, Brain } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import { StudyCard } from "./StudyCard";
import { StudyProgressBar } from "./StudyProgressBar";
import { useSpacedRepetitionGame } from "@/hooks/useSpacedRepetitionGame";

interface SpacedRepetitionGameProps {
  episodeId: string;
  episodeTitle: string;
  open: boolean;
  onClose: () => void;
}

export function SpacedRepetitionGame({
  episodeId,
  episodeTitle,
  open,
  onClose,
}: SpacedRepetitionGameProps) {
  const {
    cards,
    currentCard,
    currentCardIndex,
    showAnswer,
    loading,
    error,
    gameComplete,
    sessionStats,
    isAuthenticated,
    handleFlip,
    handleResponse,
    handleRestart,
    initializeGame,
    accuracy,
    duration,
  } = useSpacedRepetitionGame({ episodeId, onClose });

  if (loading) {
    return (
      <AnimatePresence>
        {open && (
          <Dialog.Root open={open} onOpenChange={onClose}>
            <Dialog.Portal>
              <Dialog.Overlay asChild>
                <motion.div
                  className="fixed inset-0 bg-black z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  className="fixed top-1/2 left-1/2 bg-white rounded-xl p-8 max-w-md w-full mx-4 z-50"
                  initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
                  animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                  exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
                  transition={{ duration: 0.2 }}
                  style={{ transform: "translate(-50%, -50%)" }}
                >
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading study cards...</p>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>
    );
  }

  if (error) {
    return (
      <AnimatePresence>
        {open && (
          <Dialog.Root open={open} onOpenChange={onClose}>
            <Dialog.Portal>
              <Dialog.Overlay asChild>
                <motion.div
                  className="fixed inset-0 bg-black z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  className="fixed top-1/2 left-1/2 bg-white rounded-xl p-8 max-w-md w-full mx-4 z-50"
                  initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
                  animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                  exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
                  transition={{ duration: 0.2 }}
                  style={{ transform: "translate(-50%, -50%)" }}
                >
                  <div className="text-center">
                    <div className="text-red-500 mb-4">
                      <Brain className="w-12 h-12 mx-auto" />
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
                      No Cards Available
                    </Dialog.Title>
                    <Dialog.Description className="text-gray-600 mb-6">
                      {error}
                    </Dialog.Description>
                    <div className="flex gap-3">
                      <Dialog.Close asChild>
                        <button className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                          Close
                        </button>
                      </Dialog.Close>
                      <button
                        onClick={initializeGame}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>
    );
  }

  if (gameComplete) {
    return (
      <AnimatePresence>
        {open && (
          <Dialog.Root open={open} onOpenChange={onClose}>
            <Dialog.Portal>
              <Dialog.Overlay asChild>
                <motion.div
                  className="fixed inset-0 bg-black z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  className="fixed top-1/2 left-1/2 bg-white rounded-xl p-8 max-w-md w-full mx-4 z-50"
                  initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
                  animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                  exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
                  transition={{ duration: 0.2 }}
                  style={{ transform: "translate(-50%, -50%)" }}
                >
                  <div className="text-center">
                    <motion.div
                      className="text-green-500 mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    >
                      <Trophy className="w-16 h-16 mx-auto" />
                    </motion.div>
                    <Dialog.Title className="text-2xl font-bold text-gray-900 mb-2">
                      Study Session Complete!
                    </Dialog.Title>
                    <Dialog.Description className="text-gray-600 mb-6">
                      Great work on studying {episodeTitle}
                    </Dialog.Description>

                    <motion.div
                      className="bg-gray-50 rounded-lg p-4 mb-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
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
                    </motion.div>

                    {!isAuthenticated && (
                      <motion.div
                        className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <p className="text-sm text-yellow-800">
                          <strong>Sign in to save your progress!</strong> Your study
                          data will be saved and you&apos;ll get better spaced
                          repetition scheduling.
                        </p>
                      </motion.div>
                    )}

                    <motion.div
                      className="flex gap-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Dialog.Close asChild>
                        <button className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                          Close
                        </button>
                      </Dialog.Close>
                      <button
                        onClick={handleRestart}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Study Again
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>
    );
  }

  if (!currentCard) return null;

  return (
    <AnimatePresence>
      {open && (
        <Dialog.Root open={open} onOpenChange={onClose}>
          <Dialog.Portal>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed top-1/2 left-1/2 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden z-50"
                initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
                transition={{ duration: 0.2 }}
                style={{ transform: "translate(-50%, -50%)" }}
              >
                {/* Header */}
                <motion.div
                  className="bg-white border-b border-gray-200 p-4 flex items-center justify-between"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      Study Session
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-600">
                      {episodeTitle}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Dialog.Close>
                </motion.div>

                {/* Progress bar */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <StudyProgressBar
                    currentCard={currentCardIndex + 1}
                    totalCards={cards.length}
                    correctCards={sessionStats.correct}
                    studiedCards={sessionStats.studied}
                  />
                </motion.div>

                {/* Study card */}
                <motion.div
                  className="p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <AnimatePresence mode="wait">
                    <StudyCard
                      card={currentCard}
                      onResponse={handleResponse}
                      showAnswer={showAnswer}
                      onFlip={handleFlip}
                      cardNumber={currentCardIndex + 1}
                      totalCards={cards.length}
                    />
                  </AnimatePresence>
                </motion.div>

                {/* Footer with auth reminder */}
                {!isAuthenticated && (
                  <motion.div
                    className="bg-blue-50 border-t border-blue-200 p-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <p className="text-xs text-blue-700 text-center">
                      Sign in to save your progress and get personalized spaced
                      repetition scheduling
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  );
}
