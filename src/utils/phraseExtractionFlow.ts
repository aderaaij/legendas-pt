import { PhraseExtractionService, PhraseExtraction } from "@/lib/supabase";
import {
  generateContentHash,
  parseShowInfo,
} from "@/utils/extractPhrasesUtils";
import { callPhraseExtractionAPI } from "@/utils/phraseExtractionApi";
import {
  cleanSubtitleContent,
  createFallbackPhrases,
} from "@/utils/subtitleUtils";
import { PhraseItem } from "@/types/phrase";
import { ExtractionSettings } from "@/app/upload/components/PhraseExtractor";
import { SubtitleMetadata } from "@/app/upload/page";

export interface PhraseExtractionContext {
  settings: ExtractionSettings;
  fileName?: string;
  metadata: SubtitleMetadata | null;
}

/** Look up a previously saved extraction (and its phrases) by content hash. */
async function checkExistingExtraction(
  contentHash: string,
  settings: ExtractionSettings
): Promise<{ phrases: PhraseItem[] | null; extraction: PhraseExtraction | null }> {
  if (!settings.saveToDatabase) return { phrases: null, extraction: null };

  try {
    const existingExtraction =
      await PhraseExtractionService.findExistingExtraction(contentHash);
    if (!existingExtraction) {
      return { phrases: null, extraction: null };
    }

    const existingPhrases = await PhraseExtractionService.getExtractedPhrases(
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
    console.warn("Database check failed, proceeding with extraction:", error);
    return { phrases: null, extraction: null };
  }
}

/** Persist the extracted phrases, either appending de-duplicated phrases to an
 * existing extraction (force re-extraction) or creating a new one. */
async function saveExtractionToDatabase(
  phrases: PhraseItem[],
  contentHash: string,
  cleanContent: string,
  rawContent: string,
  processingTime: number,
  ctx: PhraseExtractionContext,
  existingExtraction?: PhraseExtraction | null
): Promise<void> {
  const { settings, fileName, metadata } = ctx;

  if (!settings.saveToDatabase) return;
  if (!phrases.length) return;

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
    // append only the phrases that don't already exist.
    if (settings.forceReExtraction && existingExtraction) {
      const existingPhrases = await PhraseExtractionService.getExtractedPhrases(
        existingExtraction.id
      );
      const existingPhraseTexts = new Set(
        existingPhrases.map((p) => p.phrase.toLowerCase().trim())
      );

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

      const totalPhrasesAfterUpdate = existingPhrases.length + newPhrasesAdded;
      await PhraseExtractionService.updateExtraction(existingExtraction.id, {
        total_phrases_found: totalPhrasesAfterUpdate,
        processing_time_ms: processingTime,
      });

      return;
    }

    // Create a new extraction (original behavior).
    const extractionData = {
      content_hash: contentHash,
      content_preview: cleanContent.slice(0, 200),
      content_full: rawContent,
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

    await PhraseExtractionService.saveExtraction(extractionData, phrasesData);
  } catch (error) {
    console.error("Failed to save to database (continuing anyway):", error);
  }
}

/**
 * Extract Portuguese phrases from subtitle content: reuse a cached extraction
 * when available (creating a new record if the episode differs), otherwise call
 * the extraction API, optionally merging with existing phrases, and persist.
 * Falls back to naive phrases on any error.
 */
export async function extractPhrasesFlow(
  subtitleContent: string,
  ctx: PhraseExtractionContext
): Promise<PhraseItem[]> {
  const { settings, fileName, metadata } = ctx;

  if (!subtitleContent) {
    console.warn("No subtitle content provided");
    return [];
  }

  try {
    const startTime = Date.now();
    const cleanContent = cleanSubtitleContent(subtitleContent);
    const contentHash = generateContentHash(cleanContent);

    // Resolve show and episode for this content.
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

    // Reuse an existing extraction unless force re-extraction is requested.
    const { phrases: existingPhrases, extraction: existingExtraction } =
      await checkExistingExtraction(contentHash, settings);

    if (existingPhrases && !settings.forceReExtraction) {
      // If the matched extraction points at a different (or no) episode, save a
      // new extraction record for this episode reusing the same phrases.
      if (
        episode &&
        existingExtraction &&
        (existingExtraction.episode_id === null ||
          existingExtraction.episode_id !== episode.id)
      ) {
        const extractionData = {
          content_hash: contentHash,
          content_preview: cleanContent.slice(0, 200),
          content_full: subtitleContent,
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

        try {
          await PhraseExtractionService.saveExtraction(
            extractionData,
            phrasesData
          );
        } catch (saveError) {
          console.error(
            "Error saving new extraction for episode:",
            saveError
          );
          // Continue anyway since we have the phrases
        }
      }

      return existingPhrases;
    }

    // Call the API for a fresh extraction.
    const newPhrases = await callPhraseExtractionAPI(cleanContent);
    const processingTime = Date.now() - startTime;

    // When force re-extracting, merge de-duplicated new phrases with existing.
    let finalPhrases = newPhrases;
    if (settings.forceReExtraction && existingPhrases) {
      const existingPhraseTexts = new Set(
        existingPhrases.map((p) => p.phrase.toLowerCase().trim())
      );
      const uniqueNewPhrases = newPhrases.filter(
        (p) => !existingPhraseTexts.has(p.phrase.toLowerCase().trim())
      );
      finalPhrases = [...existingPhrases, ...uniqueNewPhrases];
    }

    await saveExtractionToDatabase(
      settings.forceReExtraction ? newPhrases : finalPhrases,
      contentHash,
      cleanContent,
      subtitleContent,
      processingTime,
      ctx,
      existingExtraction
    );

    return finalPhrases;
  } catch (error) {
    console.error("Error extracting phrases:", error);
    return createFallbackPhrases(subtitleContent);
  }
}
