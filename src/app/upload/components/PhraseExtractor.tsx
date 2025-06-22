"use client";

import { useState } from "react";
import { Play, Settings } from "lucide-react";
import { usePhraseExtraction } from "@/hooks/usePhraseExtraction";
import { SubtitleMetadata } from "../page";
import { parseShowInfo } from "@/utils/extractPhrasesUitls";

interface PhraseExtractorProps {
  subtitleContent: string;
  onExtractionSuccess: (showName: string, season?: number, episodeNumber?: number) => void;
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
        // Get show info from metadata or filename
        const { showName, season, episodeNumber } = metadata || parseShowInfo(fileName);
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
        <div className="text-sm text-gray-600">
          Ready to extract phrases from your subtitle content
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </button>

          <button
            onClick={handleExtract}
            disabled={isExtracting || !subtitleContent}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>{isExtracting ? "Extracting..." : "Extract Phrases"}</span>
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={saveToDatabase}
              onChange={(e) => setSaveToDatabase(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Save to database</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={forceReExtraction}
              onChange={(e) => setForceReExtraction(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Force re-extraction (add to existing phrases)</span>
          </label>
        </div>
      )}

      {isExtracting && (
        <div className="mt-4 flex items-center space-x-2 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">
            Extracting phrases from subtitle content...
          </span>
        </div>
      )}
    </div>
  );
}
