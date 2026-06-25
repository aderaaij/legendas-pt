"use client";

import { ArrowLeft, Plus, Settings, Copy } from "lucide-react";

import { Show, Episode } from "@/lib/supabase";
import AnkiExporter from "@/app/components/phrase/AnkiExporter";
import type { PhraseItem } from "@/types/phrase";

interface PhraseEditorHeaderProps {
  displayShowName: string;
  displayEpisodeTitle?: string;
  currentShow?: Show;
  currentEpisode?: Episode;
  ankiPhrases: PhraseItem[];
  duplicateCount: number;
  onBack: () => void;
  onEditMetadata: () => void;
  onManageDuplicates: () => void;
  onAddPhrase: () => void;
}

/** Phrase editor header: back link, show/episode title with metadata edit, and
 * the Anki export / manage duplicates / add-phrase actions. */
export default function PhraseEditorHeader({
  displayShowName,
  displayEpisodeTitle,
  currentShow,
  currentEpisode,
  ankiPhrases,
  duplicateCount,
  onBack,
  onEditMetadata,
  onManageDuplicates,
  onAddPhrase,
}: PhraseEditorHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col space-x-3">
        <button
          onClick={onBack}
          className="flex items-center space-x-1 transition-colors"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Management</span>
        </button>

        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {displayShowName}
            </h1>
            <button
              onClick={onEditMetadata}
              className="p-1 transition-colors"
              style={{ color: "var(--faint)" }}
              title="Edit metadata"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          {displayEpisodeTitle && (
            <p style={{ color: "var(--muted)" }}>{displayEpisodeTitle}</p>
          )}
          {currentShow && (
            <div
              className="flex items-center space-x-2 text-sm mt-1"
              style={{ color: "var(--faint)" }}
            >
              {currentShow.network && <span>{currentShow.network}</span>}
              {currentEpisode?.season && currentEpisode?.episode_number && (
                <>
                  <span>•</span>
                  <span>
                    S{currentEpisode.season}E{currentEpisode.episode_number}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <AnkiExporter phrases={ankiPhrases} />
        {duplicateCount > 0 && (
          <button
            onClick={onManageDuplicates}
            className="flex items-center space-x-1 px-3 py-2 rounded-md transition-colors"
            style={{ background: "var(--amber)", color: "#221603" }}
          >
            <Copy className="w-4 h-4" />
            <span>Manage Duplicates ({duplicateCount})</span>
          </button>
        )}
        <button
          onClick={onAddPhrase}
          className="flex items-center space-x-1 px-3 py-2 rounded-md transition-colors"
          style={{ background: "var(--green)", color: "#04210f" }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Phrase</span>
        </button>
      </div>
    </div>
  );
}
