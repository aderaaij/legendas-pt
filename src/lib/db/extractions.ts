import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import { generateContentHash } from "@/utils/extractPhrasesUtils";
import {
  Episode,
  ExtractedPhrase,
  PhraseExtraction,
  Show,
} from "@/types/database";

// Every phrase_extractions column except the large `content_full` body. Used for
// lookups/metadata reads so we don't transfer the full subtitle (only needed
// when actually re-running an extraction).
const EXTRACTION_COLUMNS =
  "id, content_hash, content_preview, content_length, show_id, episode_id, source, capture_timestamp, language, max_phrases, total_phrases_found, was_truncated, extraction_params, processing_time_ms, api_cost_estimate, created_at, updated_at";

export async function findExistingExtraction(
  contentHash: string
): Promise<PhraseExtraction | null> {
  const { data, error } = await supabase
    .from("phrase_extractions")
    .select(
      `
      ${EXTRACTION_COLUMNS},
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

/** A phrase ready to persist — the extractor's output shape (timestamps optional). */
export interface PersistablePhrase {
  phrase: string;
  translation: string;
  context?: string | null;
  startTime?: string;
  endTime?: string;
  speaker?: string;
  matchedConfidence?: number;
}

export interface PersistExtractionInput {
  /** Validated, (optionally) timestamp-matched phrases from the extractor. */
  phrases: PersistablePhrase[];
  /** Raw subtitle content — hashed for dedup and stored as `content_full`. */
  content: string;
  language: string;
  truncated: boolean;
  forceReExtraction: boolean;
  showId?: string | null;
  episodeId?: string | null;
  /** Resolved provider/model, persisted in `extraction_params` for provenance. */
  provider: string;
  model: string;
  /** Metadata mirrored into `extraction_params` / `source`. */
  filename?: string;
  showTitle?: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface PersistExtractionResult {
  extractionId: string;
  /** True when an extraction already existed (and re-extraction wasn't forced). */
  alreadyExists: boolean;
}

/**
 * The persistence seam: write one extraction (`phrase_extractions` +
 * `extracted_phrases`) using the caller-supplied client (service-role for the
 * worker/importer, user-scoped for a direct request). Holds **all** the DB
 * concerns — dedup, force-re-extract delete, and the two inserts — so the
 * extractor stays pure. Idempotent: a matching extraction short-circuits to
 * `{ alreadyExists: true }`, which is what makes the worker safely retry-able.
 *
 * Mirrors the save semantics that previously lived inline in
 * `app/api/extract-phrases/route.ts` (episode-scoped content hash, find/force,
 * inserts), so both planes write identically.
 */
export async function persistExtraction(
  client: SupabaseClient,
  input: PersistExtractionInput
): Promise<PersistExtractionResult> {
  const {
    phrases,
    content,
    language,
    truncated,
    forceReExtraction,
    showId,
    episodeId,
    provider,
    model,
    filename,
    showTitle,
    episodeTitle,
    seasonNumber,
    episodeNumber,
  } = input;

  // For episode-specific extractions, make the hash unique per episode so the
  // same subtitle content can exist for different episodes.
  const baseContentHash = generateContentHash(content);
  const contentHash = episodeId
    ? `${baseContentHash}_ep_${episodeId}`
    : baseContentHash;

  // Dedup: episode-specific extractions match by episode_id (so we never reuse an
  // extraction from a deleted show); otherwise match by content hash.
  let existingExtraction: { id: string } | null = null;
  if (episodeId) {
    const { data, error: findError } = await client
      .from("phrase_extractions")
      .select("id")
      .eq("episode_id", episodeId)
      .single();
    if (findError && findError.code !== "PGRST116") {
      console.error("Error finding existing episode extraction:", findError);
    }
    existingExtraction = data;
  } else {
    const { data, error: findError } = await client
      .from("phrase_extractions")
      .select("id")
      .eq("content_hash", contentHash)
      .single();
    if (findError && findError.code !== "PGRST116") {
      console.error("Error finding existing extraction:", findError);
    }
    existingExtraction = data;
  }

  if (existingExtraction && !forceReExtraction) {
    return { extractionId: existingExtraction.id, alreadyExists: true };
  }

  // Forcing re-extraction: delete the existing extraction and its phrases first.
  if (existingExtraction && forceReExtraction) {
    const { error: deletePhraseError } = await client
      .from("extracted_phrases")
      .delete()
      .eq("extraction_id", existingExtraction.id);
    if (deletePhraseError) {
      throw new Error(
        `Failed to delete existing phrases: ${deletePhraseError.message}`
      );
    }

    const { error: deleteExtractionError } = await client
      .from("phrase_extractions")
      .delete()
      .eq("id", existingExtraction.id);
    if (deleteExtractionError) {
      throw new Error(
        `Failed to delete existing extraction: ${deleteExtractionError.message}`
      );
    }
  }

  const extractionData = {
    content_hash: contentHash,
    content_preview: content.substring(0, 500),
    content_full: content,
    content_length: content.length,
    show_id: showId || null,
    episode_id: episodeId || null,
    source: filename ? "file_upload" : "rtp",
    capture_timestamp: new Date().toISOString(),
    language,
    max_phrases: 1000,
    total_phrases_found: phrases.length,
    was_truncated: truncated,
    extraction_params: {
      filename,
      showTitle,
      episodeTitle,
      seasonNumber,
      episodeNumber,
      provider,
      model,
    },
  };

  const { data: extraction, error: extractionError } = await client
    .from("phrase_extractions")
    .insert(extractionData)
    .select()
    .single();
  if (extractionError) {
    throw new Error(`Failed to save extraction: ${extractionError.message}`);
  }

  const phraseRows = phrases.map((phrase, index) => ({
    phrase: phrase.phrase,
    translation: phrase.translation,
    context: phrase.context || null,
    confidence_score: 0.9,
    extraction_id: extraction.id,
    position_in_content: index,
    start_time: phrase.startTime || null,
    end_time: phrase.endTime || null,
    speaker: phrase.speaker || null,
    matched_confidence: phrase.matchedConfidence ?? null,
  }));

  const { error: phrasesError } = await client
    .from("extracted_phrases")
    .insert(phraseRows)
    .select();
  if (phrasesError) {
    throw new Error(`Failed to save phrases: ${phrasesError.message}`);
  }

  return { extractionId: extraction.id, alreadyExists: false };
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
      ${EXTRACTION_COLUMNS},
      show:shows(*),
      episode:episodes(*)
    `
    )
    .eq("id", extractionId)
    .single();

  if (error) {
    throw new Error(`Failed to get extraction: ${error.message}`);
  }

  // shows/episodes are to-one FKs (single objects at runtime); supabase-js types
  // embeds as arrays, so cast to the declared single-object shape.
  return data as unknown as PhraseExtraction & {
    show?: Show;
    episode?: Episode;
  };
}
