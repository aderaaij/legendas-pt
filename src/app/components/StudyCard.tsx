"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  StudyCard as StudyCardType,
  StudyRating,
} from "@/types/spaced-repetition";

interface StudyCardProps {
  card: StudyCardType;
  onResponse: (rating: StudyRating, responseTime: number) => void;
  showAnswer: boolean;
  onFlip: () => void;
  cardNumber: number;
  totalCards: number;
}

export function StudyCard({
  card,
  onResponse,
  showAnswer,
  onFlip,
  cardNumber,
  totalCards,
}: StudyCardProps) {
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    setStartTime(Date.now());
  }, [card]);

  const handleResponse = (rating: StudyRating) => {
    const responseTime = Date.now() - startTime;
    onResponse(rating, responseTime);
  };

  const getRatingLabel = (rating: StudyRating) => {
    switch (rating) {
      case 1:
        return "Again";
      case 2:
        return "Hard";
      case 3:
        return "Good";
      case 4:
        return "Easy";
    }
  };

  const getRatingColor = (rating: StudyRating) => {
    switch (rating) {
      case 1:
        return "bg-red-500 hover:bg-red-600";
      case 2:
        return "bg-orange-500 hover:bg-orange-600";
      case 3:
        return "bg-green-500 hover:bg-green-600";
      case 4:
        return "bg-blue-500 hover:bg-blue-600";
    }
  };

  const getStateInfo = () => {
    if (!card.cardStudy) {
      return { label: "New", color: "bg-blue-100 text-blue-800" };
    }

    const state = card.cardStudy.state;
    switch (state) {
      case "New":
        return { label: "New", color: "bg-blue-100 text-blue-800" };
      case "Learning":
        return { label: "Learning", color: "bg-yellow-100 text-yellow-800" };
      case "Review":
        return { label: "Review", color: "bg-green-100 text-green-800" };
      case "Relearning":
        return { label: "Relearning", color: "bg-orange-100 text-orange-800" };
      default:
        return { label: "New", color: "bg-blue-100 text-blue-800" };
    }
  };

  const stateInfo = getStateInfo();

  return (
    <motion.div
      key={card.phrase.id}
      className="flex flex-col items-center justify-center min-h-[500px] p-6"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      {/* Progress indicator */}
      <div className="w-full max-w-md mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>
            Card {cardNumber} of {totalCards}
          </span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${stateInfo.color}`}
          >
            {stateInfo.label}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(cardNumber / totalCards) * 100}%` }}
          />
        </div>
      </div>

      {/* Card content with flip animation */}
      <div
        className="w-full max-w-md cursor-pointer perspective-1000"
        onClick={onFlip}
      >
        <motion.div
          className="relative w-full transform-style-preserve-3d"
          animate={{ rotateY: showAnswer ? 180 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Front of card (Portuguese) */}
          <motion.div
            className="w-full bg-white rounded-xl shadow-lg border border-gray-200 backface-hidden"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
            }}
          >
            <div className="p-5 text-center study-card-container flex flex-col justify-between hover:shadow-xl transition-shadow duration-200">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">
                Portuguese
              </div>
              <div className="flex-1 flex items-center justify-center px-2">
                <div className="text-lg sm:text-xl font-semibold text-gray-900 leading-relaxed study-card-text">
                  {card.phrase.phrase}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-3">
                Click to reveal translation
              </div>
            </div>
          </motion.div>

          {/* Back of card (Portuguese + English) */}
          <motion.div
            className="absolute top-0 left-0 w-full bg-white rounded-xl shadow-lg border border-gray-200 backface-hidden"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="p-5 text-center study-card-container flex flex-col justify-between hover:shadow-xl transition-shadow duration-200">
              <div className="flex-1 space-y-3 px-2">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">
                    Portuguese
                  </div>
                  <div className="text-base font-medium text-gray-700 leading-relaxed study-card-text">
                    {card.phrase.phrase}
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">
                    English
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-gray-900 leading-relaxed study-card-text">
                    {card.phrase.translation}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Response buttons */}
      {showAnswer && (
        <motion.div
          className="w-full max-w-md mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <motion.div
            className="text-sm text-gray-600 text-center mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            How well did you know this phrase?
          </motion.div>
          <div className="grid grid-cols-2 gap-3">
            {([1, 2, 3, 4] as StudyRating[]).map((rating, index) => (
              <motion.button
                key={rating}
                onClick={() => handleResponse(rating)}
                className={`
                  ${getRatingColor(rating)}
                  text-white py-3 px-4 rounded-lg font-medium
                  transition-all duration-200 hover:scale-105
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50
                `}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="text-lg font-semibold">
                  {getRatingLabel(rating)}
                </div>
                <div className="text-xs opacity-80">
                  {rating === 1 && "Completely forgot"}
                  {rating === 2 && "Difficult to recall"}
                  {rating === 3 && "Recalled with effort"}
                  {rating === 4 && "Easy to recall"}
                </div>
              </motion.button>
            ))}
          </div>

          {/* Keyboard shortcuts hint */}
          <motion.div
            className="text-xs text-gray-400 text-center mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.3 }}
          >
            Keyboard shortcuts: 1-4 for rating, Space to flip
          </motion.div>
        </motion.div>
      )}

      {/* Flip instruction */}
      {!showAnswer && (
        <motion.div
          className="text-sm text-gray-500 mt-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          Press{" "}
          <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Space</kbd> or
          click the card to reveal the answer
        </motion.div>
      )}
    </motion.div>
  );
}
