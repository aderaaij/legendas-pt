import Link from "next/link";
import Image from "next/image";
import { Settings, Calendar, Clock, Brain } from "lucide-react";

import { Show, Episode, ExtractedPhrase } from "@/lib/supabase";
import { generateShowSlug } from "@/utils/slugify";
import { useAuth } from "@/hooks/useAuth";
import { formatDuration } from "@/utils/formatDuration";
import { formatDateToLocale } from "@/utils/formatDate";

interface EpisodeInfoSectionProps {
  show: Show;
  episode: Episode;
  phrases: ExtractedPhrase[];
  onStartStudy: () => void;
}

export const EpisodeInfoSection = ({
  show,
  episode,
  phrases,
  onStartStudy,
}: EpisodeInfoSectionProps) => {
  const { isAdmin } = useAuth();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Thumbnail */}
        {show.poster_url && (
          <div className="flex-shrink-0">
            <Image
              src={show.poster_url}
              alt={`${show.name} poster`}
              width={160}
              height={240}
              className="w-32 h-48 md:w-40 md:h-60 object-cover rounded-lg shadow-md"
            />
          </div>
        )}

        {/* Episode details */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {show.name}
              </h1>
              <p className="text-xl text-gray-700 mb-2">
                Season {episode.season}, Episode {episode.episode_number}
                {episode.title && ` - ${episode.title}`}
              </p>
              <p className="text-gray-600 mb-2">
                {phrases.length} phrase{phrases.length !== 1 ? "s" : ""}{" "}
                extracted
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {phrases.length > 0 && (
                <button
                  onClick={onStartStudy}
                  className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Brain className="w-4 h-4" />
                  <span>Start Study</span>
                </button>
              )}
              {isAdmin && (
                <Link
                  href={`/${generateShowSlug(show.name)}/s${episode.season
                    ?.toString()
                    .padStart(2, "0")}e${episode.episode_number
                    ?.toString()
                    .padStart(2, "0")}/edit`}
                  className="inline-flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Edit Episode</span>
                </Link>
              )}
            </div>
          </div>

          {/* Episode Description */}
          {episode.description && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Description
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {episode.description}
              </p>
            </div>
          )}

          {/* Additional info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
            {episode.air_date && (
              <span className="bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDateToLocale(episode.air_date)}
              </span>
            )}
            {episode.duration_minutes && (
              <span className="bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(episode.duration_minutes)}
              </span>
            )}
            {show.network && (
              <span className="bg-gray-100 px-2 py-1 rounded">
                {show.network}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
