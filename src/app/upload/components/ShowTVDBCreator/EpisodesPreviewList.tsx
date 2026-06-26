"use client";

import { Hash } from "lucide-react";

import type { EpisodePreview } from "./useShowTVDBCreator";

interface EpisodesPreviewListProps {
  episodes: EpisodePreview[];
  season: number;
}

/** Read-only list of the episodes that will be imported with the new show. */
export default function EpisodesPreviewList({
  episodes,
  season,
}: EpisodesPreviewListProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Hash className="w-5 h-5" />
        Episodes to Import
      </h3>
      <div
        className="rounded-lg max-h-80 overflow-y-auto"
        style={{ border: "1px solid var(--border)" }}
      >
        {episodes.map((episode) => (
          <div
            key={episode.id}
            className="p-3 last:border-b-0"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-medium">
                  S{season}E{episode.episodeNumber}
                </span>
                <span className="ml-2" style={{ color: "var(--muted)" }}>
                  {episode.title}
                </span>
              </div>
              <span className="text-sm" style={{ color: "var(--faint)" }}>
                {episode.airDate}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
