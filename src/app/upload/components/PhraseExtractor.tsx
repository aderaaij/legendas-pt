"use client";

import { useState } from "react";
import { Play, Settings } from "lucide-react";
import { usePhraseExtraction } from "@/hooks/usePhraseExtraction";
import { SubtitleMetadata } from "../page";
import { parseShowInfo } from "@/utils/extractPhrasesUitls";

interface PhraseExtractorProps {
  subtitleContent: string;
  onExtractionSuccess: (
    showName: string,
    season?: number,
    episodeNumber?: number
  ) => void;
  fileName?: string;
  metadata: SubtitleMetadata | null;
}

export interface ExtractionSettings {
  saveToDatabase: boolean;
  forceReExtraction: boolean;
}

export default function PhraseExtractor({
  subtitleContent,
  onExtractionSuccess,
  fileName,
  metadata,
}: PhraseExtractorProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const [forceReExtraction, setForceReExtraction] = useState(false);

  const settings: ExtractionSettings = {
    saveToDatabase,
    forceReExtraction,
  };

  const { isExtracting, handleExtraction } = usePhraseExtraction({
    settings,
    fileName,
    metadata,
  });

  const handleExtract = async () => {
    if (!subtitleContent) return;

    try {
      await handleExtraction(subtitleContent, () => {
        const { showName, season, episodeNumber } =
          metadata || parseShowInfo(fileName);

        onExtractionSuccess(showName, season, episodeNumber);
      });
    } catch (error) {
      console.error("Error extracting phrases:", error);
      alert(
        `Error extracting phrases: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          Ready to extract phrases from your subtitle content
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-1 transition-colors hover:opacity-80"
            style={{ color: "var(--muted)" }}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </button>

          <button
            onClick={handleExtract}
            disabled={isExtracting || !subtitleContent}
            className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <Play className="w-4 h-4" />
            <span>{isExtracting ? "Extracting..." : "Extract Phrases"}</span>
          </button>
        </div>
      </div>

      {showSettings && (
        <div
          className="p-4 rounded-lg space-y-3"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={saveToDatabase}
              onChange={(e) => setSaveToDatabase(e.target.checked)}
              className="rounded"
              style={{ accentColor: "var(--accent)" }}
            />
            <span className="text-sm" style={{ color: "var(--text)" }}>Save to database</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={forceReExtraction}
              onChange={(e) => setForceReExtraction(e.target.checked)}
              className="rounded"
              style={{ accentColor: "var(--accent)" }}
            />
            <span className="text-sm" style={{ color: "var(--text)" }}>
              Force re-extraction (add to existing phrases)
            </span>
          </label>
        </div>
      )}

      {isExtracting && (
        <div className="mt-4 flex items-center space-x-2" style={{ color: "var(--accent2)" }}>
          <div
            className="animate-spin rounded-full h-4 w-4 border-b-2"
            style={{ borderColor: "var(--accent)", borderBottomColor: "var(--accent)" }}
          ></div>
          <span className="text-sm">
            Extracting phrases from subtitle content...
          </span>
        </div>
      )}
    </div>
  );
}
