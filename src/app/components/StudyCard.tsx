'use client';

import { useState, useEffect } from 'react';
import { StudyCard as StudyCardType, StudyRating } from '@/types/spaced-repetition';

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
      case 1: return 'Again';
      case 2: return 'Hard';
      case 3: return 'Good';
      case 4: return 'Easy';
    }
  };

  const getRatingColor = (rating: StudyRating) => {
    switch (rating) {
      case 1: return 'bg-red-500 hover:bg-red-600';
      case 2: return 'bg-orange-500 hover:bg-orange-600';
      case 3: return 'bg-green-500 hover:bg-green-600';
      case 4: return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  const getStateInfo = () => {
    if (!card.cardStudy) {
      return { label: 'New', color: 'bg-blue-100 text-blue-800' };
    }

    const state = card.cardStudy.state;
    switch (state) {
      case 'New':
        return { label: 'New', color: 'bg-blue-100 text-blue-800' };
      case 'Learning':
        return { label: 'Learning', color: 'bg-yellow-100 text-yellow-800' };
      case 'Review':
        return { label: 'Review', color: 'bg-green-100 text-green-800' };
      case 'Relearning':
        return { label: 'Relearning', color: 'bg-orange-100 text-orange-800' };
      default:
        return { label: 'New', color: 'bg-blue-100 text-blue-800' };
    }
  };

  const stateInfo = getStateInfo();

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      {/* Progress indicator */}
      <div className="w-full max-w-md mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Card {cardNumber} of {totalCards}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${stateInfo.color}`}>
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

      {/* Card content */}
      <div 
        className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 cursor-pointer transition-all duration-200 hover:shadow-xl"
        onClick={onFlip}
      >
        <div className="p-8 text-center min-h-[200px] flex flex-col justify-center">
          {!showAnswer ? (
            <div>
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Portuguese
              </div>
              <div className="text-2xl font-semibold text-gray-900 mb-4">
                {card.phrase.phrase}
              </div>
              <div className="text-sm text-gray-400">
                Click to reveal translation
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Portuguese
              </div>
              <div className="text-xl font-medium text-gray-700 mb-4">
                {card.phrase.phrase}
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                  English
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {card.phrase.translation}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Response buttons */}
      {showAnswer && (
        <div className="w-full max-w-md mt-6">
          <div className="text-sm text-gray-600 text-center mb-4">
            How well did you know this phrase?
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([1, 2, 3, 4] as StudyRating[]).map((rating) => (
              <button
                key={rating}
                onClick={() => handleResponse(rating)}
                className={`
                  ${getRatingColor(rating)}
                  text-white py-3 px-4 rounded-lg font-medium
                  transition-all duration-200 hover:scale-105
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50
                `}
              >
                <div className="text-lg font-semibold">{getRatingLabel(rating)}</div>
                <div className="text-xs opacity-80">
                  {rating === 1 && 'Completely forgot'}
                  {rating === 2 && 'Difficult to recall'}
                  {rating === 3 && 'Recalled with effort'}
                  {rating === 4 && 'Easy to recall'}
                </div>
              </button>
            ))}
          </div>
          
          {/* Keyboard shortcuts hint */}
          <div className="text-xs text-gray-400 text-center mt-4">
            Keyboard shortcuts: 1-4 for rating, Space to flip
          </div>
        </div>
      )}

      {/* Flip instruction */}
      {!showAnswer && (
        <div className="text-sm text-gray-500 mt-4 text-center">
          Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Space</kbd> or click the card to reveal the answer
        </div>
      )}
    </div>
  );
}