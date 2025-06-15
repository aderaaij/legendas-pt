'use client';

interface StudyProgressBarProps {
  currentCard: number;
  totalCards: number;
  correctCards: number;
  studiedCards: number;
}

export function StudyProgressBar({
  currentCard,
  totalCards,
  correctCards,
  studiedCards,
}: StudyProgressBarProps) {
  const progressPercentage = (currentCard / totalCards) * 100;
  const accuracyPercentage = studiedCards > 0 ? (correctCards / studiedCards) * 100 : 0;

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{currentCard} / {totalCards}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-600">Correct: {correctCards}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-600">Incorrect: {studiedCards - correctCards}</span>
          </div>
        </div>
        {studiedCards > 0 && (
          <div className="text-gray-600">
            Accuracy: <span className="font-medium">{accuracyPercentage.toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}