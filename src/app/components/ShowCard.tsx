import { Calendar, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ShowWithExtractions } from "@/hooks/useHomePage";
import { formatDate } from "@/utils/formatDate";
import { generateShowSlug } from "@/utils/slugify";

interface ShowCardProps {
  show: ShowWithExtractions;
}

export const ShowCard = ({ show }: ShowCardProps) => {
  return (
    <Link
      key={show.id}
      href={`/${generateShowSlug(show.name)}`}
      className="bg-gray-50 flex rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-blue-300"
    >
      <div className="flex items-start w-full">
        {show.poster_url && (
          <Image
            src={show.poster_url}
            alt={show.name}
            width={128}
            height={64}
            className="rounded-lg mr-4"
          />
        )}
        <div className="flex flex-col flex-grow gap-4">
          <div className="flex justify-between">
            <div className="flex flex-col">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                {show.name}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="bg-gray-200 px-2 py-1 rounded text-xs">
                  {show.source}
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(show.lastExtraction)}</span>
                </span>
              </div>
            </div>

            <Play className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {show.extractionCount}
              </div>
              <div className="text-xs text-gray-500">
                {show.extractionCount === 1 ? "Extraction" : "Extractions"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {show.totalPhrases}
              </div>
              <div className="text-xs text-gray-500">
                {show.totalPhrases === 1 ? "Phrase" : "Phrases"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
