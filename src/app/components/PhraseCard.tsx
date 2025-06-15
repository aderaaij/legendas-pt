import { ExtractedPhrase } from "@/lib/supabase";
import { FavoriteButton } from "./FavoriteButton";

interface PhraseCardProps {
  phrase: ExtractedPhrase;
}

export const PhraseCard = ({ phrase }: PhraseCardProps) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50 flex">
      <div className="flex flex-col w-full">
        <div className="font-semibold text-gray-800 mb-2">{phrase.phrase}</div>
        <div className="text-sm text-gray-600 mb-3">{phrase.translation}</div>
      </div>
      <FavoriteButton phraseId={phrase.id} className="mb-auto" />
    </div>
  );
};
