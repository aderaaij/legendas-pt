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
      className="w-full text-left p-3 rounded-lg border transition-colors hover:bg-[rgba(255,255,255,0.04)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-start gap-3">
        <Calendar
          className="w-4 h-4 mt-0.5"
          style={{ color: "var(--faint)" }}
        />
        <div className="flex-1">
          <div className="font-medium" style={{ color: "var(--text)" }}>
            S{episode.season?.toString().padStart(2, "0")}E
            {episode.episode_number?.toString().padStart(2, "0")}
            {episode.title && ` - ${episode.title}`}
          </div>
          {episode.overview && (
            <div
              className="text-sm line-clamp-2 mt-1"
              style={{ color: "var(--muted)" }}
            >
              {episode.overview}
            </div>
          )}
          {episode.air_date && (
            <div className="text-xs mt-1" style={{ color: "var(--faint)" }}>
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
