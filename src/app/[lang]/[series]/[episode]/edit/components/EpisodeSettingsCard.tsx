"use client";

import {
  Trash2,
  Edit3,
  FileText,
  Calendar,
  TrendingUp,
} from "lucide-react";

import { Show, Episode } from "@/lib/supabase";
import StatCard from "@/app/components/ui/StatCard";

interface EpisodeSettingsCardProps {
  show: Show | null;
  episodeData: Episode | null;
  phrasesCount: number;
  extractionsCount: number;
  isDeletingEpisode: boolean;
  onEditMetadata: () => void;
  onDeleteEpisode: () => void;
}

/** Episode settings header (edit/delete actions) plus the summary stat cards. */
export default function EpisodeSettingsCard({
  show,
  episodeData,
  phrasesCount,
  extractionsCount,
  isDeletingEpisode,
  onEditMetadata,
  onDeleteEpisode,
}: EpisodeSettingsCardProps) {
  const episodeCode = `S${episodeData?.season
    ?.toString()
    .padStart(2, "0")}E${episodeData?.episode_number
    ?.toString()
    .padStart(2, "0")}`;

  return (
    <div
      className="rounded-[var(--radius-lg)] p-6 mb-8"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
          Episode Settings
        </h2>
        <div className="flex space-x-3">
          <button
            onClick={onEditMetadata}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Metadata</span>
          </button>
          <button
            onClick={onDeleteEpisode}
            disabled={isDeletingEpisode}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border2)",
              color: "var(--accent2)",
            }}
          >
            {isDeletingEpisode ? (
              <div
                className="animate-spin rounded-full h-4 w-4 border-2"
                style={{ borderColor: "var(--accent2)", borderTopColor: "transparent" }}
              ></div>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Delete Episode</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5" style={{ color: "var(--blue)" }} />}
          value={phrasesCount}
          label="Total Phrases"
          color="var(--blue)"
        />
        <StatCard
          icon={
            <TrendingUp className="w-5 h-5" style={{ color: "var(--green)" }} />
          }
          value={extractionsCount}
          label="Extractions"
          color="var(--green)"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" style={{ color: "var(--gold)" }} />}
          value={episodeCode}
          label="Episode"
          color="var(--gold)"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" style={{ color: "var(--amber)" }} />}
          value={show?.name}
          label="Show"
          color="var(--amber)"
        />
      </div>
    </div>
  );
}
