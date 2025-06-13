import { useState, useCallback } from "react";
import { PhraseExtractionService } from "../lib/supabase";
import {
  generateContentHash,
  parseShowInfo,
} from "../utils/extractPhrasesUitls";

import { callPhraseExtractionAPI } from "@/utils/phraseExtractionApi";
import { ExtractionSettings } from "@/app/components/PhraseExtractor";
import { SubtitleMetadata } from "@/app/upload/page";
import {
  cleanSubtitleContent,
  createFallbackPhrases,
} from "@/utils/subtitleUtils";
import { PhraseItem } from "@/app/components/AnkiExporter";

interface UsePhraseExtractionProps {
  settings: ExtractionSettings;
  fileName?: string;
  metadata: SubtitleMetadata | null;
}

export const usePhraseExtraction = ({
  settings,
  fileName,
  metadata,
}: UsePhraseExtractionProps) => {
  const [isExtracting, setIsExtracting] = useState(false);

  const checkExistingExtraction = useCallback(
    async (contentHash: string) => {
      if (!settings.saveToDatabase) return null;

      console.log("Checking for existing extraction with hash:", contentHash);

      try {
        const existingExtraction =
          await PhraseExtractionService.findExistingExtraction(contentHash);
        if (!existingExtraction) {
          console.log(
            "No existing extraction found, proceeding with new extraction"
          );
          return null;
        }

        console.log("Found existing extraction, loading phrases...");
        const existingPhrases =
          await PhraseExtractionService.getExtractedPhrases(
            existingExtraction.id
          );
        if (!existingPhrases?.length) {
          console.log("Existing extraction has no phrases");
          return null;
        }

        console.log(`Found ${existingPhrases.length} existing phrases`);
        return existingPhrases.map(
          (item): PhraseItem => ({
            phrase: item.phrase,
            translation: item.translation,
            frequency: 1,
          })
        );
      } catch (error) {
        console.warn(
          "Database check failed, proceeding with extraction:",
          error
        );
        return null;
      }
    },
    [settings.saveToDatabase]
  );

  const saveToDatabase = useCallback(
    async (
      phrases: PhraseItem[],
      contentHash: string,
      cleanContent: string,
      processingTime: number
    ) => {
      if (!settings.saveToDatabase || !phrases.length) return;

      try {
        console.log("Attempting to save to database...");

        const { showName, season, episodeNumber } =
          metadata || parseShowInfo(fileName);

        const show = await PhraseExtractionService.findOrCreateShow(
          showName,
          metadata?.source || "rtp"
        );

        let episode;
        if (season && episodeNumber) {
          episode = await PhraseExtractionService.findOrCreateEpisode(
            show.id,
            season,
            episodeNumber,
            `Episode ${episodeNumber}`
          );
        }

        const extractionData = {
          content_hash: contentHash,
          content_preview: cleanContent.slice(0, 200),
          content_length: cleanContent.length,
          show_id: show.id,
          episode_id: episode?.id,
          source: fileName || "uploaded_file",
          capture_timestamp: new Date().toISOString(),
          language: "pt",
          max_phrases: settings.maxPhrases,
          total_phrases_found: phrases.length,
          was_truncated: false,
          extraction_params: {
            minPhraseLength: settings.minPhraseLength,
            maxPhraseLength: settings.maxPhraseLength,
          },
          processing_time_ms: processingTime,
        };

        const phrasesData = phrases.map((phrase) => ({
          phrase: phrase.phrase,
          translation: phrase.translation,
        }));

        await PhraseExtractionService.saveExtraction(
          extractionData,
          phrasesData
        );
      } catch (error) {
        console.error("Failed to save to database (continuing anyway):", error);
      }
    },
    [settings, fileName, metadata]
  );

  const extractPhrases = useCallback(
    async (subtitleContent: string): Promise<PhraseItem[]> => {
      if (!subtitleContent) {
        console.warn("No subtitle content provided");
        return [];
      }

      try {
        const startTime = Date.now();
        const cleanContent = cleanSubtitleContent(subtitleContent);
        const contentHash = generateContentHash(cleanContent);

        console.log("Generated content hash:", contentHash);
        console.log("Clean content length:", cleanContent.length);

        // Check for existing extraction
        const existingPhrases = await checkExistingExtraction(contentHash);
        if (existingPhrases) {
          console.log("Using existing phrases");
          return existingPhrases;
        }

        // Call API for new extraction
        const phrases = await callPhraseExtractionAPI(cleanContent);
        const processingTime = Date.now() - startTime;

        // Save to database
        await saveToDatabase(
          phrases,
          contentHash,
          cleanContent,
          processingTime
        );

        return phrases;
      } catch (error) {
        console.error("Error extracting phrases:", error);
        return createFallbackPhrases(subtitleContent);
      }
    },
    [checkExistingExtraction, saveToDatabase]
  );

  const handleExtraction = useCallback(
    async (
      subtitleContent: string,
      onPhrasesExtracted: (phrases: PhraseItem[]) => void
    ) => {
      if (!subtitleContent) return;

      setIsExtracting(true);
      try {
        const phrases = await extractPhrases(subtitleContent);
        onPhrasesExtracted(phrases);
      } catch (error) {
        console.error("Error extracting phrases:", error);
        throw error;
      } finally {
        setIsExtracting(false);
      }
    },
    [extractPhrases]
  );

  return {
    isExtracting,
    handleExtraction,
  };
};
