import { Calendar, Play } from "lucide-react";
import Link from "next/link";

import { ClientDate } from "@/app/components/ClientDate";
import { generateShowSlug } from "@/utils/slugify";
import { Show } from "@/lib/supabase";
import { EpisodeWithStats } from "./SeriesPageClient";

interface SeriesEpisodeCardProps {
  show: Show;
  episode: EpisodeWithStats;
}

export const SeriesEpisodeCard = ({
  show,
  episode,
}: SeriesEpisodeCardProps) => {
  return (
    <Link
      key={episode.id}
      href={`/${generateShowSlug(show.name)}/s${episode.season
        ?.toString()
        .padStart(2, "0")}e${episode.episode_number
        ?.toString()
        .padStart(2, "0")}`}
      className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-blue-300 block"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2">
            S{episode.season?.toString().padStart(2, "0")}E
            {episode.episode_number?.toString().padStart(2, "0")}
            {episode.title && `: ${episode.title}`}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {episode.lastExtraction && (
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <ClientDate dateString={episode.lastExtraction} />
              </span>
            )}
          </div>
        </div>
        <Play className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">
            {episode.extractionCount}
          </div>
          <div className="text-xs text-gray-500">
            {episode.extractionCount === 1 ? "Extraction" : "Extractions"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">
            {episode.totalPhrases}
          </div>
          <div className="text-xs text-gray-500">
            {episode.totalPhrases === 1 ? "Phrase" : "Phrases"}
          </div>
        </div>
      </div>
    </Link>
  );
};
