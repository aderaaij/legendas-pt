"use client";

import { useState, useEffect } from "react";
import { Play, Settings, BookOpen } from "lucide-react";


interface PhraseItem {
  phrase: string;
  context: string;
  translation: string;
  frequency: number;
}

interface PhraseExtractorProps {
  subtitleContent: string;
  onPhrasesExtracted: (phrases: PhraseItem[]) => void;
}

export default function PhraseExtractor({
  subtitleContent,
  onPhrasesExtracted,
}: PhraseExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [minPhraseLength, setMinPhraseLength] = useState(3);
  const [maxPhraseLength, setMaxPhraseLength] = useState(6);
  const [maxPhrases, setMaxPhrases] = useState(100);



  const extractPhrases = async (): Promise<PhraseItem[]> => {
    if (!subtitleContent) return [];

    try {
      // Clean and prepare the subtitle content
      const cleanContent = subtitleContent
        .split(/\n/)
        .filter((line) => {
          const trimmed = line.trim();
          // Keep lines that contain actual dialogue
          return (
            trimmed.length > 0 && // Not empty
            !trimmed.includes("-->") && // Not timestamps
            !trimmed.includes("WEBVTT") && // Not VTT header
            !/^\d+$/.test(trimmed) && // Not line numbers
            !trimmed.startsWith("#") && // Not comments (but allow lines with # inside)
            /[a-záàâãéèêíìîóòôõúùûçñA-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇÑ]/.test(trimmed) // Contains Portuguese text
          );
        })
        .map((line) => {
          // Clean up character names like "HOMEM:" but keep the dialogue
          return line.replace(/^[A-Z]+\s*:\s*/, "").trim();
        })
        .filter((line) => line.length > 3) // Remove very short lines after cleaning
        .join("\n");

      const response = await fetch("/api/extract-phrases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: cleanContent,
          maxPhrases: maxPhrases,
          language: "portuguese",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to extract phrases from API");
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Convert API response to our PhraseItem format
      const phrases: PhraseItem[] = result.phrases.map((item: any) => ({
        phrase: item.phrase,
        translation: item.translation,
        context: item.context || `Example: ${item.phrase}`,
        frequency: item.frequency || 1,
      }));

      return phrases;
    } catch (error) {
      console.error("Error extracting phrases:", error);

      // Fallback to a simple extraction if API fails
      return extractPhrasesFallback();
    }
  };

  // Simple fallback extraction method
  const extractPhrasesFallback = (): PhraseItem[] => {
    const sentences = subtitleContent
      .split(/[.!?]+|\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15 && !s.includes("#") && !s.includes("-->"))
      .slice(0, 20); // Take first 20 sentences as fallback

    const fallbackPhrases: PhraseItem[] = sentences.map((sentence, index) => ({
      phrase: sentence.toLowerCase(),
      translation: `[Translation needed for: "${sentence}"]`,
      context: sentence,
      frequency: 1,
    }));

    return fallbackPhrases.slice(0, Math.min(10, maxPhrases));
  };



  const handleExtract = async () => {
    if (!subtitleContent) return;

    setIsExtracting(true);
    try {
      const phrases = await extractPhrases();
      onPhrasesExtracted(phrases);
    } catch (error) {
      console.error("Error extracting phrases:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  useEffect(() => {
    if (subtitleContent) {
      handleExtract();
    }
  }, [subtitleContent, minPhraseLength, maxPhraseLength, maxPhrases]);

  if (!subtitleContent) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Upload subtitles to extract phrases</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={handleExtract}
          disabled={isExtracting}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExtracting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Play className="w-4 h-4" />
          )}
{isExtracting ? "Extracting phrases with AI..." : "Extract Phrases"}
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

{showSettings && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum phrase length (words): {minPhraseLength}
            </label>
            <input
              type="range"
              min="2"
              max="5"
              value={minPhraseLength}
              onChange={(e) => setMinPhraseLength(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum phrase length (words): {maxPhraseLength}
            </label>
            <input
              type="range"
              min="3"
              max="8"
              value={maxPhraseLength}
              onChange={(e) => setMaxPhraseLength(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum phrases: {maxPhrases}
            </label>
            <input
              type="range"
              min="25"
              max="200"
              step="25"
              value={maxPhrases}
              onChange={(e) => setMaxPhrases(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
