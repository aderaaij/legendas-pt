"use client";

import { useState, useEffect } from "react";
import { Play, Settings, BookOpen } from "lucide-react";
import { usePhraseExtraction } from "../../hooks/usePhraseExtraction";
import { SubtitleMetadata } from "../upload/page";
import { PhraseItem } from "./AnkiExporter";

interface PhraseExtractorProps {
  subtitleContent: string;
  onPhrasesExtracted: (phrases: PhraseItem[]) => void;
  fileName?: string;
  metadata: SubtitleMetadata | null;
}

export interface ExtractionSettings {
  minPhraseLength: number;
  maxPhraseLength: number;
  saveToDatabase: boolean;
}

const DEFAULT_SETTINGS: ExtractionSettings = {
  minPhraseLength: 3,
  maxPhraseLength: 6,
  saveToDatabase: true,
};

export default function PhraseExtractor({
  subtitleContent,
  onPhrasesExtracted,
  fileName,
  metadata,
}: PhraseExtractorProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [minPhraseLength, setMinPhraseLength] = useState(3);
  const [maxPhraseLength, setMaxPhraseLength] = useState(6);
  const [saveToDatabase, setSaveToDatabase] = useState(true);

  const settings: ExtractionSettings = {
    minPhraseLength,
    maxPhraseLength,
    saveToDatabase,
  };

  const { isExtracting, handleExtraction } = usePhraseExtraction({
    settings,
    fileName,
    metadata,
  });

  const handleExtract = async () => {
    if (!subtitleContent) return;

    try {
      await handleExtraction(subtitleContent, onPhrasesExtracted);
    } catch (error) {
      console.error("Error extracting phrases:", error);
      alert(
        `Error extracting phrases: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  useEffect(() => {
    if (subtitleContent) {
      handleExtract();
    }
  }, [subtitleContent, minPhraseLength, maxPhraseLength]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Phrase Extraction
          </h3>
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
        <div className="border-t pt-4 mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Phrase Length
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={minPhraseLength}
                onChange={(e) => setMinPhraseLength(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Phrase Length
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={maxPhraseLength}
                onChange={(e) => setMaxPhraseLength(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={saveToDatabase}
                onChange={(e) => setSaveToDatabase(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Save to database</span>
            </label>
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            <strong>Note:</strong> The system will now extract ALL useful phrases from the content without any artificial limits. This provides maximum exposure to Portuguese language patterns.
          </div>
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
