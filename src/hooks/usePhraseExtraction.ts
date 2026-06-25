import { useState, useCallback } from "react";
import { PhraseExtractionService } from "../lib/supabase";
import {
  generateContentHash,
  parseShowInfo,
} from "../utils/extractPhrasesUtils";

import { callPhraseExtractionAPI } from "@/utils/phraseExtractionApi";
import { ExtractionSettings } from "@/app/upload/components/PhraseExtractor";
import { SubtitleMetadata } from "@/app/upload/page";
import {
  cleanSubtitleContent,
  createFallbackPhrases,
} from "@/utils/subtitleUtils";
import { PhraseItem } from "@/types/phrase";

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
      console.log("=== DEBUG: saveToDatabase function called ===");
      console.log("Settings.saveToDatabase:", settings.saveToDatabase);
      console.log("Phrases.length:", phrases.length);
      
      if (!settings.saveToDatabase) {
        console.log("Early return: saveToDatabase is false");
        return;
      }
      
      if (!phrases.length) {
        console.log("Early return: no phrases to save");
        return;
      }

      try {
        console.log("=== DEBUG: saveToDatabase called ===");
        console.log("Phrases count:", phrases.length);
        console.log("Metadata:", metadata);
        console.log("FileName:", fileName);

        const { showName, season, episodeNumber } =
          metadata || parseShowInfo(fileName);
        
        console.log("Parsed show info:", { showName, season, episodeNumber });

        const show = await PhraseExtractionService.findOrCreateShow(
          showName,
          metadata?.source || "rtp"
        );
        
        console.log("Found/created show:", show);

        let episode;
        if (season && episodeNumber) {
          episode = await PhraseExtractionService.findOrCreateEpisode(
            show.id,
            season,
            episodeNumber,
            `Episode ${episodeNumber}`
          );
          console.log("Found/created episode:", episode);
        } else {
          console.log("No season/episode info - creating show-only extraction");
        }

        console.log("Checking force re-extraction logic...");
        console.log("settings.forceReExtraction:", settings.forceReExtraction);
        console.log("existingExtraction:", existingExtraction);
        
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

        console.log("Creating new extraction (not force re-extraction)...");
        
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

        console.log("Saving extraction with data:", extractionData);
        console.log("Phrases to save:", phrasesData.length);
        console.log("About to call PhraseExtractionService.saveExtraction...");
        
        try {
          await PhraseExtractionService.saveExtraction(
            extractionData,
            phrasesData
          );
          console.log("Extraction saved successfully!");
        } catch (saveError) {
          console.error("Error in saveExtraction:", saveError);
          throw saveError;
        }
      } catch (error) {
        console.error("Failed to save to database (continuing anyway):", error);
      }
    },
    [settings, fileName, metadata]
  );

  const extractPhrases = useCallback(
    async (subtitleContent: string): Promise<PhraseItem[]> => {
      console.log("=== DEBUG: extractPhrases called ===");
      console.log("Subtitle content length:", subtitleContent?.length);
      
      if (!subtitleContent) {
        console.warn("No subtitle content provided");
        return [];
      }

      try {
        const startTime = Date.now();
        const cleanContent = cleanSubtitleContent(subtitleContent);
        const contentHash = generateContentHash(cleanContent);


        // Get show and episode info first
        const { showName, season, episodeNumber } = metadata || parseShowInfo(fileName);
        console.log("Parsed show info:", { showName, season, episodeNumber });

        const show = await PhraseExtractionService.findOrCreateShow(
          showName,
          metadata?.source || "rtp"
        );
        console.log("Found/created show:", show);

        let episode;
        if (season && episodeNumber) {
          episode = await PhraseExtractionService.findOrCreateEpisode(
            show.id,
            season,
            episodeNumber,
            `Episode ${episodeNumber}`
          );
          console.log("Found/created episode:", episode);
        }

        // Check for existing extraction
        console.log("Checking for existing extraction with hash:", contentHash);
        const { phrases: existingPhrases, extraction: existingExtraction } = await checkExistingExtraction(contentHash);
        console.log("Existing extraction result:", { existingPhrases: existingPhrases?.length || 0, existingExtraction: !!existingExtraction });
        
        if (existingPhrases && !settings.forceReExtraction) {
          console.log("Found existing phrases - checking if we need to create new extraction for different episode");
          
          // If we have a new episode that's different from the existing extraction's episode,
          // we should create a new extraction record pointing to the new episode
          // This includes cases where existing extraction has no episode (episode_id: null)
          if (
            episode &&
            existingExtraction &&
            (existingExtraction.episode_id === null ||
              existingExtraction.episode_id !== episode.id)
          ) {
            console.log("Creating new extraction record for different episode");
            console.log("Existing extraction episode_id:", existingExtraction.episode_id);
            console.log("New episode id:", episode.id);
            
            // Create new extraction data for the new episode
            const extractionData = {
              content_hash: contentHash,
              content_preview: cleanContent.slice(0, 200),
              content_length: cleanContent.length,
              show_id: show.id,
              episode_id: episode.id,
              source: fileName || "uploaded_file",
              capture_timestamp: new Date().toISOString(),
              language: "pt",
              max_phrases: existingPhrases.length,
              total_phrases_found: existingPhrases.length,
              was_truncated: false,
              extraction_params: {},
              processing_time_ms: 0, // Reusing existing extraction
            };

            const phrasesData = existingPhrases.map((phrase) => ({
              phrase: phrase.phrase,
              translation: phrase.translation,
            }));

            console.log("Saving new extraction for episode:", extractionData);
            console.log("About to save extraction with episode_id:", episode.id);
            try {
              const saveResult = await PhraseExtractionService.saveExtraction(extractionData, phrasesData);
              console.log("New extraction saved successfully for episode!");
              console.log("Saved extraction result:", saveResult.extraction);
              console.log("Saved extraction ID:", saveResult.extraction.id);
              console.log("Saved extraction episode_id:", saveResult.extraction.episode_id);
            } catch (saveError) {
              console.error("Error saving new extraction for episode:", saveError);
              // Continue anyway since we have the phrases
            }
          } else {
            console.log("Existing extraction already associated with correct episode or no episode specified");
          }
          
          return existingPhrases;
        }

        // Call API for new extraction
        console.log("Calling phrase extraction API...");
        const newPhrases = await callPhraseExtractionAPI(cleanContent);
        const processingTime = Date.now() - startTime;
        
        console.log("API returned phrases:", newPhrases.length);

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
