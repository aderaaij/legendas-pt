import { ExtractedPhrase } from "@/lib/supabase";
import { FavoriteButton } from "./FavoriteButton";
import { PhraseProgressBar } from "./PhraseProgressBar";

interface PhraseCardProps {
  phrase: ExtractedPhrase;
  isSelected?: boolean;
  onToggleSelection?: (phraseId: string) => void;
  showSelection?: boolean;
  isFavorite: boolean;
  onToggleFavorite: (phraseId: string) => Promise<void>;
  progressPercentage?: number;
  learningState?: 'New' | 'Learning' | 'Review' | 'Relearning';
  isLearned?: boolean;
  showProgress?: boolean;
  viewMode?: 'grid' | 'list';
}

export const PhraseCard = ({ 
  phrase, 
  isSelected = false, 
  onToggleSelection, 
  showSelection = false,
  isFavorite,
  onToggleFavorite,
  progressPercentage = 0,
  learningState = 'New',
  isLearned = false,
  showProgress = false,
  viewMode = 'grid'
}: PhraseCardProps) => {
  const isListView = viewMode === 'list';
  
  if (isListView) {
    return (
      <div className={`border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all bg-gray-50 ${
        isSelected && showSelection ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}>
        <div className="flex items-start gap-4">
          {showSelection && (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelection?.(phrase.id)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
            </div>
          )}
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
            <div className="font-semibold text-gray-800 break-words">{phrase.phrase}</div>
            <div className="text-gray-600 break-words">{phrase.translation}</div>
          </div>
          
          <div className="flex items-center gap-2">
            <FavoriteButton 
              phraseId={phrase.id} 
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        </div>
        
        {showProgress && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <PhraseProgressBar
              progressPercentage={progressPercentage}
              state={learningState}
              isLearned={isLearned}
            />
          </div>
        )}
      </div>
    );
  }

  // Grid view (original layout)
  return (
    <div className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all bg-gray-50 flex flex-col h-full ${
      isSelected && showSelection ? 'ring-2 ring-blue-500 bg-blue-50' : ''
    }`}>
      <div className="flex items-start gap-3 flex-1">
        {showSelection && (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection?.(phrase.id)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          </div>
        )}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="font-semibold text-gray-800 mb-2">{phrase.phrase}</div>
          <div className="text-sm text-gray-600 mb-3 flex-1">{phrase.translation}</div>
          {showProgress && (
            <PhraseProgressBar
              progressPercentage={progressPercentage}
              state={learningState}
              isLearned={isLearned}
              className="mt-auto"
            />
          )}
        </div>
        <FavoriteButton 
          phraseId={phrase.id} 
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
    </div>
  );
};
