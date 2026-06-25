"use client";

import { Calendar } from "lucide-react";

import { Episode } from "@/lib/supabase";

interface EpisodeListItemProps {
  episode: Episode;
  onSelect: () => void;
}

/** A single selectable episode row in the show selector. */
export default function EpisodeListItem({
  episode,
  onSelect,
}: EpisodeListItemProps) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
        <div className="flex-1">
          <div className="font-medium text-gray-900">
            S{episode.season?.toString().padStart(2, "0")}E
            {episode.episode_number?.toString().padStart(2, "0")}
            {episode.title && ` - ${episode.title}`}
          </div>
          {episode.overview && (
            <div className="text-sm text-gray-600 line-clamp-2 mt-1">
              {episode.overview}
            </div>
          )}
          {episode.air_date && (
            <div className="text-xs text-gray-500 mt-1">
              📅 {new Date(episode.air_date).toLocaleDateString()}
              {episode.runtime && (
                <span className="ml-2">⏱️ {episode.runtime}min</span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
