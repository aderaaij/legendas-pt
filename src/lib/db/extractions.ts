import { supabase } from "@/lib/supabase-client";
import {
  Episode,
  ExtractedPhrase,
  PhraseExtraction,
  Show,
} from "@/types/database";

export async function findExistingExtraction(
  contentHash: string
): Promise<PhraseExtraction | null> {
  const { data, error } = await supabase
    .from("phrase_extractions")
    .select(
      `
      *,
      show:shows(*),
      episode:episodes(*)
    `
    )
    .eq("content_hash", contentHash)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows found - this is expected for new content
      return null;
    } else {
      // Actual database error
      console.error("Database error searching for extraction:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  return data;
}

export async function getExtractedPhrases(
  extractionId: string
): Promise<ExtractedPhrase[]> {
  const { data, error } = await supabase
    .from("extracted_phrases")
    .select("*")
    .eq("extraction_id", extractionId)
    .order("position_in_content", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch phrases: ${error.message}`);
  }

  return data || [];
}

export async function saveExtraction(
  extractionData: Omit<PhraseExtraction, "id" | "created_at" | "updated_at">,
  phrases: Omit<ExtractedPhrase, "id" | "extraction_id" | "created_at">[]
): Promise<{ extraction: PhraseExtraction; phrases: ExtractedPhrase[] }> {
  // Insert extraction record
  const { data: extraction, error: extractionError } = await supabase
    .from("phrase_extractions")
    .insert(extractionData)
    .select()
    .single();

  if (extractionError) {
    console.error("Failed to save extraction:", extractionError);
    throw new Error(`Failed to save extraction: ${extractionError.message}`);
  }

  // Insert phrases
  const phrasesWithExtractionId = phrases.map((phrase, index) => ({
    ...phrase,
    extraction_id: extraction.id,
    position_in_content: index,
  }));

  const { data: savedPhrases, error: phrasesError } = await supabase
    .from("extracted_phrases")
    .insert(phrasesWithExtractionId)
    .select();

  if (phrasesError) {
    console.error("Failed to save phrases:", phrasesError);
    throw new Error(`Failed to save phrases: ${phrasesError.message}`);
  }

  return {
    extraction,
    phrases: savedPhrases || [],
  };
}

export async function deleteExtraction(extractionId: string): Promise<void> {
  // First delete all associated phrases
  const { error: phrasesError } = await supabase
    .from("extracted_phrases")
    .delete()
    .eq("extraction_id", extractionId);

  if (phrasesError) {
    console.error("Failed to delete phrases:", phrasesError);
    throw new Error(`Failed to delete phrases: ${phrasesError.message}`);
  }

  // Then delete the extraction
  const { error: extractionError } = await supabase
    .from("phrase_extractions")
    .delete()
    .eq("id", extractionId);

  if (extractionError) {
    console.error("Failed to delete extraction:", extractionError);
    throw new Error(`Failed to delete extraction: ${extractionError.message}`);
  }
}

export async function updateExtraction(
  extractionId: string,
  updates: Partial<Omit<PhraseExtraction, "id" | "created_at" | "updated_at">>
): Promise<PhraseExtraction> {
  const { data, error } = await supabase
    .from("phrase_extractions")
    .update(updates)
    .eq("id", extractionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update extraction: ${error.message}`);
  }

  return data;
}

export async function getExtractionWithMetadata(
  extractionId: string
): Promise<PhraseExtraction & { show?: Show; episode?: Episode }> {
  const { data, error } = await supabase
    .from("phrase_extractions")
    .select(
      `
      *,
      show:shows(*),
      episode:episodes(*)
    `
    )
    .eq("id", extractionId)
    .single();

  if (error) {
    throw new Error(`Failed to get extraction: ${error.message}`);
  }

  return data;
}
