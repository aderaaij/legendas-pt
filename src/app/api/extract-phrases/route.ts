import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateContentHash } from "@/utils/extractPhrasesUtils";
import { parseVTTWithTimestamps, parseSRTWithTimestamps, matchPhrasesToTimestamps, SubtitleBlock } from "@/utils/subtitleUtils";
import { extractPhrases } from "@/lib/llm/extract-phrases";
import { MissingApiKeyError, UnknownProviderError } from "@/lib/llm/providers";
import type { Provider } from "@/lib/llm/types";
import { resolveSaveAuth } from "@/lib/supabase-admin";

interface PhraseExtractionRequest {
  content: string;
  language?: string;
  filename?: string;
  showTitle?: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  saveToDatabase?: boolean;
  forceReExtraction?: boolean;
  showId?: string;
  episodeId?: string;
  fileType?: 'vtt' | 'srt' | 'txt';
  provider?: Provider;
  model?: string;
}

export async function POST(request: NextRequest) {
  try {
    const {
      content,
      language = "pt",
      filename,
      showTitle,
      episodeTitle,
      seasonNumber,
      episodeNumber,
      saveToDatabase = false,
      forceReExtraction = false,
      showId,
      episodeId,
      fileType,
      provider,
      model,
    }: PhraseExtractionRequest = await request.json();

    // Database writes require authorization. A normal request carries the user's
    // JWT; a trusted server-to-server call (e.g. the RTP importer) carries the
    // service key. Resolve the client once and reuse it for every write below —
    // this avoids a per-request auth-server round-trip and short-lived-token
    // expiry on long imports.
    let saveClient: SupabaseClient | null = null;
    if (saveToDatabase) {
      const auth = await resolveSaveAuth(request.headers.get("authorization"));
      if ("error" in auth) {
        return NextResponse.json(
          { error: auth.error.message },
          { status: auth.error.status }
        );
      }
      saveClient = auth.client;
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Parse subtitles with timestamps if format is VTT or SRT
    let originalBlocks: SubtitleBlock[] = [];
    let contentForAI = content;
    
    try {
      if (fileType === 'vtt' || (filename && filename.endsWith('.vtt'))) {
        originalBlocks = parseVTTWithTimestamps(content);
        // Clean content for AI by joining all text blocks
        contentForAI = originalBlocks.map(block => block.text).join(' ');
      } else if (fileType === 'srt' || (filename && filename.endsWith('.srt'))) {
        originalBlocks = parseSRTWithTimestamps(content);
        // Clean content for AI by joining all text blocks  
        contentForAI = originalBlocks.map(block => block.text).join(' ');
      }
    } catch (timestampParseError) {
      console.warn('Failed to parse timestamps, falling back to original content:', timestampParseError);
      // If timestamp parsing fails, use original content as fallback
      contentForAI = content;
    }

    // Run the extraction through the provider-agnostic LLM layer. The effective
    // provider/model is the per-request override, else the LLM_PROVIDER /
    // LLM_MODEL env default, else the built-in default. Structured output and
    // truncation handling live in the LLM layer now.
    let extraction;
    try {
      extraction = await extractPhrases(contentForAI, { provider, model });
    } catch (llmError) {
      if (llmError instanceof MissingApiKeyError) {
        return NextResponse.json(
          { error: `API key for ${llmError.provider} not configured` },
          { status: 500 }
        );
      }
      if (llmError instanceof UnknownProviderError) {
        return NextResponse.json(
          { error: `Unknown LLM provider: ${llmError.value}` },
          { status: 400 }
        );
      }
      console.error("LLM extraction failed:", llmError);
      return NextResponse.json(
        { error: "Failed to process with the selected LLM provider" },
        { status: 500 }
      );
    }

    const truncated = extraction.truncated;
    const resolvedSelection = extraction.resolved;
    if (truncated) {
      console.warn("Response was truncated due to token limit");
    }

    // Filter and validate phrases (the schema guarantees the shape; this drops
    // empty or too-short entries).
    const validPhrases = extraction.phrases.filter(
      (phrase) =>
        phrase.phrase &&
        phrase.translation &&
        typeof phrase.phrase === "string" &&
        typeof phrase.translation === "string" &&
        phrase.phrase.trim().length > 5
    );

    // Save to database if requested
    let extractionId: string | undefined;
    if (saveToDatabase) {
      try {
        // Reuse the client resolved during the auth check above (user-scoped, or
        // service-role for trusted internal calls).
        const authenticatedSupabase = saveClient!;

        // Generate content hash
        const baseContentHash = generateContentHash(content);
        // For episode-specific extractions, make hash unique per episode to avoid constraint violations
        // This allows the same subtitle content to exist for different episodes
        const contentHash = episodeId ? `${baseContentHash}_ep_${episodeId}` : baseContentHash;
        let existingExtraction = null;
        
        // Check for existing extraction using the appropriate method
        if (episodeId) {
          // For episode-specific extractions, check ONLY by episode_id first
          // This ensures we don't reuse extractions from deleted shows
          const { data, error: findError } = await authenticatedSupabase
            .from("phrase_extractions")
            .select("id")
            .eq("episode_id", episodeId)
            .single();
            
          if (findError && findError.code !== 'PGRST116') {
            console.error("Error finding existing episode extraction:", findError);
          }
          
          existingExtraction = data;
          console.log(`Episode ${episodeId}: ${existingExtraction ? 'Found existing extraction' : 'No existing extraction found'}`);
        } else {
          // Check by content hash (original behavior for non-episode specific extractions)
          const { data, error: findError } = await authenticatedSupabase
            .from("phrase_extractions")
            .select("id")
            .eq("content_hash", contentHash)
            .single();

          if (findError && findError.code !== 'PGRST116') {
            console.error("Error finding existing extraction:", findError);
          }
          
          existingExtraction = data;
        }

        if (existingExtraction && !forceReExtraction) {
          return NextResponse.json({
            phrases: validPhrases,
            total: validPhrases.length,
            truncated,
            provider: resolvedSelection.provider,
            model: resolvedSelection.model,
            extractionId: existingExtraction.id,
            alreadyExists: true,
            message: episodeId 
              ? "Episode already processed. Use forceReExtraction to override."
              : "Content already exists in database. Use forceReExtraction to override.",
          });
        }

        // If forcing re-extraction, delete the existing extraction and its phrases
        if (existingExtraction && forceReExtraction) {
          // Delete existing phrases first
          const { error: deletePhraseError } = await authenticatedSupabase
            .from("extracted_phrases")
            .delete()
            .eq("extraction_id", existingExtraction.id);

          if (deletePhraseError) {
            console.error("Failed to delete existing phrases:", deletePhraseError);
            throw new Error(`Failed to delete existing phrases: ${deletePhraseError.message}`);
          }

          // Delete existing extraction
          const { error: deleteExtractionError } = await authenticatedSupabase
            .from("phrase_extractions")
            .delete()
            .eq("id", existingExtraction.id);

          if (deleteExtractionError) {
            console.error("Failed to delete existing extraction:", deleteExtractionError);
            throw new Error(`Failed to delete existing extraction: ${deleteExtractionError.message}`);
          }
        }

        // Create new extraction record using authenticated client
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
          max_phrases: 1000, // Based on our extensive extraction
          total_phrases_found: validPhrases.length,
          was_truncated: truncated,
          extraction_params: {
            filename,
            showTitle,
            episodeTitle,
            seasonNumber,
            episodeNumber,
            provider: resolvedSelection.provider,
            model: resolvedSelection.model,
          },
        };

        // Insert extraction record directly with authenticated client
        const { data: extraction, error: extractionError } = await authenticatedSupabase
          .from("phrase_extractions")
          .insert(extractionData)
          .select()
          .single();

        if (extractionError) {
          console.error("Failed to save extraction:", extractionError);
          throw new Error(`Failed to save extraction: ${extractionError.message}`);
        }

        // Match phrases to timestamps if we have original blocks
        const phrasesWithTimestamps = originalBlocks.length > 0 
          ? matchPhrasesToTimestamps(validPhrases, originalBlocks)
          : validPhrases.map((phrase: { phrase: string; translation: string }) => ({ ...phrase, matchedConfidence: 0 }));

        // Insert phrases directly with authenticated client
        const phrasesWithExtractionId = phrasesWithTimestamps.map((phrase: any, index: number) => ({
          phrase: phrase.phrase,
          translation: phrase.translation,
          context: phrase.context || null,
          confidence_score: 0.9,
          extraction_id: extraction.id,
          position_in_content: index,
          start_time: phrase.startTime || null,
          end_time: phrase.endTime || null,
          speaker: phrase.speaker || null,
          matched_confidence: phrase.matchedConfidence || null,
        }));

        const { error: phrasesError } = await authenticatedSupabase
          .from("extracted_phrases")
          .insert(phrasesWithExtractionId)
          .select();

        if (phrasesError) {
          console.error("Failed to save phrases:", phrasesError);
          throw new Error(`Failed to save phrases: ${phrasesError.message}`);
        }

        extractionId = extraction.id;
      } catch (dbError) {
        console.error("Database save error:", dbError);
        return NextResponse.json(
          {
            error: "Failed to save to database",
            details: dbError instanceof Error ? dbError.message : "Unknown database error",
            phrases: validPhrases, // Still return the phrases even if save failed
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      phrases: validPhrases,
      total: validPhrases.length,
      truncated,
      provider: resolvedSelection.provider,
      model: resolvedSelection.model,
      extractionId,
      message: truncated
        ? "Response was truncated. Consider reducing maxPhrases or content size for complete results."
        : undefined,
    });
  } catch (error) {
    console.error("Error in extract-phrases API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
