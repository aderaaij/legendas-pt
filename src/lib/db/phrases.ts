import { supabase } from "@/lib/supabase-client";
import { ExtractedPhrase } from "@/types/database";

import { getExtractedPhrases } from "./extractions";

// Search functionality
export async function searchPhrases(
  query: string,
  limit: number = 50
): Promise<ExtractedPhrase[]> {
  const { data, error } = await supabase
    .from("extracted_phrases")
    .select(
      `
      *,
      extraction:phrase_extractions(
        source,
        capture_timestamp,
        show:shows(name),
        episode:episodes(season, episode_number, title)
      )
    `
    )
    .or(`phrase.ilike.%${query}%,translation.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  return data || [];
}

// Analytics
export async function getExtractionStats() {
  const { data, error } = await supabase.from("phrase_extractions").select(`
      id,
      source,
      show_id,
      show:shows(name),
      total_phrases_found,
      created_at,
      was_truncated
    `);

  if (error) {
    throw new Error(`Failed to get stats: ${error.message}`);
  }

  return (data || []).map((item) => ({
    ...item,
    show:
      Array.isArray(item.show) && item.show.length > 0 ? item.show[0] : null,
  }));
}

// Delete a specific phrase
export async function deletePhrase(phraseId: string): Promise<void> {
  const { error } = await supabase
    .from("extracted_phrases")
    .delete()
    .eq("id", phraseId);

  if (error) {
    throw new Error(`Failed to delete phrase: ${error.message}`);
  }
}

// Update a specific phrase
export async function updatePhrase(
  phraseId: string,
  updates: Partial<Omit<ExtractedPhrase, "id" | "extraction_id" | "created_at">>
): Promise<ExtractedPhrase> {
  const { data, error } = await supabase
    .from("extracted_phrases")
    .update(updates)
    .eq("id", phraseId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update phrase: ${error.message}`);
  }

  return data;
}

// Add a new phrase to an extraction
export async function addPhrase(
  extractionId: string,
  phrase: string,
  translation: string,
  position?: number
): Promise<ExtractedPhrase> {
  // Get the current max position if position not provided
  if (position === undefined) {
    const { data: phrases } = await supabase
      .from("extracted_phrases")
      .select("position_in_content")
      .eq("extraction_id", extractionId)
      .order("position_in_content", { ascending: false })
      .limit(1);

    position = (phrases?.[0]?.position_in_content || 0) + 1;
  }

  const { data, error } = await supabase
    .from("extracted_phrases")
    .insert({
      extraction_id: extractionId,
      phrase,
      translation,
      position_in_content: position,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add phrase: ${error.message}`);
  }

  return data;
}

// Normalize phrase for comparison (remove case, punctuation, extra spaces)
function normalizePhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
}

// Find duplicate phrases within an extraction
export async function findDuplicatePhrasesInExtraction(
  extractionId: string
): Promise<{
  duplicateGroups: Array<{
    normalizedPhrase: string;
    phrases: ExtractedPhrase[];
  }>;
  totalDuplicates: number;
}> {
  const phrases = await getExtractedPhrases(extractionId);

  // Group phrases by normalized version (lowercase, trimmed, punctuation removed)
  const phraseGroups = new Map<string, ExtractedPhrase[]>();

  for (const phrase of phrases) {
    const normalized = normalizePhrase(phrase.phrase);
    if (!phraseGroups.has(normalized)) {
      phraseGroups.set(normalized, []);
    }
    phraseGroups.get(normalized)!.push(phrase);
  }

  // Filter to only groups with duplicates
  const duplicateGroups = Array.from(phraseGroups.entries())
    .filter(([_, phrases]) => phrases.length > 1)
    .map(([normalizedPhrase, phrases]) => ({
      normalizedPhrase,
      phrases: phrases.sort((a, b) => a.phrase.localeCompare(b.phrase)),
    }));

  const totalDuplicates = duplicateGroups.reduce(
    (sum, group) => sum + group.phrases.length - 1,
    0
  );

  return { duplicateGroups, totalDuplicates };
}

// Merge multiple phrases into one, keeping the best translation
export async function mergePhrases(
  phrasesToMerge: ExtractedPhrase[],
  selectedPhrase: string,
  selectedTranslation: string
): Promise<ExtractedPhrase> {
  if (phrasesToMerge.length < 2) {
    throw new Error("Need at least 2 phrases to merge");
  }

  // Keep the phrase with the earliest position_in_content as the "primary" one
  const primaryPhrase = phrasesToMerge.reduce((earliest, current) =>
    (current.position_in_content || 0) < (earliest.position_in_content || 0)
      ? current
      : earliest
  );

  // Update the primary phrase with the selected text and translation
  const updatedPhrase = await updatePhrase(primaryPhrase.id, {
    phrase: selectedPhrase,
    translation: selectedTranslation,
    // Keep the earliest position
    position_in_content: primaryPhrase.position_in_content,
  });

  // Delete all other phrases
  const phrasesToDelete = phrasesToMerge.filter(
    (p) => p.id !== primaryPhrase.id
  );
  await Promise.all(phrasesToDelete.map((phrase) => deletePhrase(phrase.id)));

  return updatedPhrase;
}

// Get phrases with duplicate analysis for an extraction
export async function getPhrasesWithDuplicateAnalysis(
  extractionId: string
): Promise<{
  phrases: (ExtractedPhrase & {
    isDuplicate: boolean;
    duplicateGroup?: string;
    duplicateCount?: number;
  })[];
  duplicateGroups: Array<{
    normalizedPhrase: string;
    phrases: ExtractedPhrase[];
  }>;
}> {
  const phrases = await getExtractedPhrases(extractionId);
  const { duplicateGroups } = await findDuplicatePhrasesInExtraction(
    extractionId
  );

  // Create a map of phrase ID to duplicate info
  const duplicateMap = new Map<string, { group: string; count: number }>();

  for (const group of duplicateGroups) {
    for (const phrase of group.phrases) {
      duplicateMap.set(phrase.id, {
        group: group.normalizedPhrase,
        count: group.phrases.length,
      });
    }
  }

  // Enhance phrases with duplicate information
  const enhancedPhrases = phrases.map((phrase) => {
    const duplicateInfo = duplicateMap.get(phrase.id);
    return {
      ...phrase,
      isDuplicate: !!duplicateInfo,
      duplicateGroup: duplicateInfo?.group,
      duplicateCount: duplicateInfo?.count,
    };
  });

  return { phrases: enhancedPhrases, duplicateGroups };
}

// Get phrases for a specific episode
export async function getPhrasesForEpisode(episodeId: string) {
  const { data: extractions, error: extractionsError } = await supabase
    .from("phrase_extractions")
    .select("id")
    .eq("episode_id", episodeId);

  if (extractionsError) {
    throw new Error(`Failed to get extractions: ${extractionsError.message}`);
  }

  if (!extractions || extractions.length === 0) {
    return [];
  }

  // Get all phrases for all extractions of this episode
  const allPhrases = await Promise.all(
    extractions.map(async (extraction) => {
      const phrases = await getExtractedPhrases(extraction.id);
      return phrases.map((phrase) => ({
        ...phrase,
        extractionId: extraction.id,
      }));
    })
  );

  // Flatten the array of arrays
  return allPhrases.flat();
}

// Get phrases for a specific show (all episodes)
export async function getPhrasesForShow(showId: string) {
  const { data: extractions, error: extractionsError } = await supabase
    .from("phrase_extractions")
    .select("id, episode_id")
    .eq("show_id", showId);

  if (extractionsError) {
    throw new Error(`Failed to get extractions: ${extractionsError.message}`);
  }

  if (!extractions || extractions.length === 0) {
    return [];
  }

  // Get all phrases for all extractions of this show
  const allPhrases = await Promise.all(
    extractions.map(async (extraction) => {
      const phrases = await getExtractedPhrases(extraction.id);
      return phrases.map((phrase) => ({
        ...phrase,
        extractionId: extraction.id,
        episodeId: extraction.episode_id,
      }));
    })
  );

  // Flatten the array of arrays
  return allPhrases.flat();
}
