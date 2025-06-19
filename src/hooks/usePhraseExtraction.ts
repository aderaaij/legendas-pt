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
      if (!settings.saveToDatabase) return { phrases: null, extraction: null };


      try {
        const existingExtraction =
          await PhraseExtractionService.findExistingExtraction(contentHash);
        if (!existingExtraction) {
          return { phrases: null, extraction: null };
        }

        const existingPhrases =
          await PhraseExtractionService.getExtractedPhrases(
            existingExtraction.id
          );
        if (!existingPhrases?.length) {
          return { phrases: null, extraction: existingExtraction };
        }

        const phraseItems = existingPhrases.map(
          (item): PhraseItem => ({
            phrase: item.phrase,
            translation: item.translation,
            frequency: 1,
          })
        );
        
        return { phrases: phraseItems, extraction: existingExtraction };
      } catch (error) {
        console.warn(
          "Database check failed, proceeding with extraction:",
          error
        );
        return { phrases: null, extraction: null };
      }
    },
    [settings.saveToDatabase]
  );

  const saveToDatabase = useCallback(
    async (
      phrases: PhraseItem[],
      contentHash: string,
      cleanContent: string,
      processingTime: number,
      existingExtraction?: any
    ) => {
      if (!settings.saveToDatabase || !phrases.length) return;

      try {

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

        // If we have an existing extraction and force re-extraction is enabled,
        // update the existing extraction
        if (settings.forceReExtraction && existingExtraction) {
          
          // Get existing phrases to filter out duplicates
          const existingPhrases = await PhraseExtractionService.getExtractedPhrases(existingExtraction.id);
          const existingPhraseTexts = new Set(existingPhrases.map(p => p.phrase.toLowerCase().trim()));
          
          // Add only new phrases that don't already exist
          let newPhrasesAdded = 0;
          for (const phrase of phrases) {
            if (!existingPhraseTexts.has(phrase.phrase.toLowerCase().trim())) {
              await PhraseExtractionService.addPhrase(
                existingExtraction.id,
                phrase.phrase,
                phrase.translation
              );
              newPhrasesAdded++;
            }
          }
          
          
          // Update extraction metadata with the total count after adding new phrases
          const totalPhrasesAfterUpdate = existingPhrases.length + newPhrasesAdded;
          await PhraseExtractionService.updateExtraction(existingExtraction.id, {
            total_phrases_found: totalPhrasesAfterUpdate,
            processing_time_ms: processingTime,
          });
          
          return;
        }

        // Create new extraction (original behavior)
        const extractionData = {
          content_hash: contentHash,
          content_preview: cleanContent.slice(0, 200),
          content_length: cleanContent.length,
          show_id: show.id,
          episode_id: episode?.id,
          source: fileName || "uploaded_file",
          capture_timestamp: new Date().toISOString(),
          language: "pt",
          max_phrases: phrases.length, // Use actual number extracted
          total_phrases_found: phrases.length,
          was_truncated: false,
          extraction_params: {},
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


        // Check for existing extraction
        const { phrases: existingPhrases, extraction: existingExtraction } = await checkExistingExtraction(contentHash);
        if (existingPhrases && !settings.forceReExtraction) {
          return existingPhrases;
        }

        // Call API for new extraction
        const newPhrases = await callPhraseExtractionAPI(cleanContent);
        const processingTime = Date.now() - startTime;

        // If force re-extraction and we have existing phrases, combine them
        let finalPhrases = newPhrases;
        if (settings.forceReExtraction && existingPhrases) {
          
          // Create a set of existing phrase texts for deduplication
          const existingPhraseTexts = new Set(existingPhrases.map(p => p.phrase.toLowerCase().trim()));
          
          // Filter out new phrases that already exist
          const uniqueNewPhrases = newPhrases.filter(p => 
            !existingPhraseTexts.has(p.phrase.toLowerCase().trim())
          );
          
          // Combine existing and unique new phrases
          finalPhrases = [...existingPhrases, ...uniqueNewPhrases];
          
        }

        // Save to database
        await saveToDatabase(
          settings.forceReExtraction ? newPhrases : finalPhrases,
          contentHash,
          cleanContent,
          processingTime,
          existingExtraction
        );

        return finalPhrases;
      } catch (error) {
        console.error("Error extracting phrases:", error);
        return createFallbackPhrases(subtitleContent);
      }
    },
    [checkExistingExtraction, saveToDatabase, settings.forceReExtraction]
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
