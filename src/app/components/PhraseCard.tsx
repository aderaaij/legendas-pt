import { ExtractedPhrase } from "@/lib/supabase";
import { FavoriteButton } from "./FavoriteButton";

interface PhraseCardProps {
  phrase: ExtractedPhrase;
  isSelected?: boolean;
  onToggleSelection?: (phraseId: string) => void;
  showSelection?: boolean;
  isFavorite: boolean;
  onToggleFavorite: (phraseId: string) => Promise<void>;
}

export const PhraseCard = ({ 
  phrase, 
  isSelected = false, 
  onToggleSelection, 
  showSelection = false,
  isFavorite,
  onToggleFavorite
}: PhraseCardProps) => {
  return (
    <div className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all bg-gray-50 flex ${
      isSelected && showSelection ? 'ring-2 ring-blue-500 bg-blue-50' : ''
    }`}>
      {showSelection && (
        <div className="flex items-start mr-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection?.(phrase.id)}
            className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
        </div>
      )}
      <div className="flex flex-col w-full">
        <div className="font-semibold text-gray-800 mb-2">{phrase.phrase}</div>
        <div className="text-sm text-gray-600 mb-3">{phrase.translation}</div>
      </div>
      <FavoriteButton 
        phraseId={phrase.id} 
        className="mb-auto" 
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
};
