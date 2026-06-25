import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateContentHash } from "@/utils/extractPhrasesUitls";
import { parseVTTWithTimestamps, parseSRTWithTimestamps, matchPhrasesToTimestamps, SubtitleBlock } from "@/utils/subtitleUtils";

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
}

// Define the JSON schema for structured outputs
const phraseExtractionSchema = {
  type: "object",
  properties: {
    phrases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phrase: {
            type: "string",
            description: "The exact Portuguese phrase",
          },
          translation: {
            type: "string",
            description: "Natural English translation",
          },
        },
        required: ["phrase", "translation"],
        additionalProperties: false,
      },
    },
  },
  required: ["phrases"],
  additionalProperties: false,
} as const;

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
    }: PhraseExtractionRequest = await request.json();

    // If saveToDatabase is true, we need authentication
    if (saveToDatabase) {
      const authHeader = request.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Authentication required for database operations" },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      
      // Create authenticated Supabase client for database operations
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );

      // Verify authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return NextResponse.json(
          { error: "Invalid authentication" },
          { status: 401 }
        );
      }
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const prompt = `You are a Portuguese language learning expert. Analyze the following Portuguese subtitle content and extract ALL useful phrases for language learners. Be extremely comprehensive and thorough - extract as many valuable learning phrases as possible.

For each phrase, provide:
1. The exact Portuguese phrase (preserve original capitalization and structure)
2. A natural English translation

Extract EVERYTHING useful including:
- Complete sentences and meaningful phrases
- Common expressions, idioms, and sayings
- Conversational phrases and responses
- Colloquialisms and everyday language
- Question forms, exclamations, and responses
- Emotional expressions and reactions
- Transitional phrases and connectors
- Commands, requests, and suggestions
- Time expressions and descriptive phrases
- Short but meaningful phrases (3+ words)
- Interjections and common Portuguese exclamations
- Verb phrases and common constructions
- Adjective phrases that are commonly used
- Any phrase pattern that would help someone learning Portuguese

Only avoid:
- Isolated single words (unless they're meaningful interjections like "Nossa!" or "Puxa!")
- Incomplete fragments that don't make grammatical sense
- Highly technical jargon
- Proper nouns unless they're part of common expressions
- Extremely common basic phrases that beginners already know: "boa noite", "bom dia", "boa tarde", "obrigado", "obrigada", "por favor", "desculpa", "com licença", "olá", "tchau", "sim", "não"

CRITICAL REQUIREMENTS:
- NEVER include duplicate phrases - each phrase should appear only once in your response
- Skip overly basic greetings and common courtesy phrases that every beginner knows
- Focus on phrases that provide real learning value beyond basic politeness

IMPORTANT: Be extremely thorough. Extract hundreds of phrases if they exist in the content. This is for dedicated language learners who want maximum exposure to authentic Portuguese. Don't hold back - extract everything that could be useful for learning.

Content:
${contentForAI}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini", // use 4.1 mini
        messages: [
          {
            role: "system",
            content:
              "You are a helpful Portuguese language learning assistant. Extract useful phrases from the provided content according to the specified criteria.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.3,
        max_tokens: 32000, // Maximum for GPT-4.1-mini (128k context, 32k output)
        // Use structured outputs instead of manual JSON parsing
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "phrase_extraction_response",
            strict: true,
            schema: phraseExtractionSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        { error: "Failed to process with OpenAI API" },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Check for refusal (safety mechanism)
    if (data.choices?.[0]?.message?.refusal) {
      console.error(
        "OpenAI refused the request:",
        data.choices[0].message.refusal
      );
      return NextResponse.json(
        { error: "Request was refused by OpenAI for safety reasons" },
        { status: 400 }
      );
    }

    // Check if the response was truncated due to max_tokens limit
    const finishReason = data.choices?.[0]?.finish_reason;
    if (finishReason === "length") {
      console.warn("Response was truncated due to token limit");
      // We'll still try to parse what we got, but log this for monitoring
    }

    const content_text = data.choices?.[0]?.message?.content;

    if (!content_text) {
      return NextResponse.json(
        { error: "No response from OpenAI" },
        { status: 500 }
      );
    }

    // With structured outputs, we can directly parse the JSON without cleaning
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content_text);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content_text);
      console.error("Parse error:", parseError);

      // If parsing fails due to truncation, try to handle it gracefully
      if (finishReason === "length") {
        // Try to find the last complete phrase entry
        const lastCompleteEntry = content_text.lastIndexOf('{"phrase":');
        if (lastCompleteEntry > 0) {
          // Find the closing of the phrases array before the truncation
          const beforeLastEntry = content_text.substring(0, lastCompleteEntry);
          const lastComma = beforeLastEntry.lastIndexOf(",");

          if (lastComma > 0) {
            // Reconstruct valid JSON by closing the array and object
            const repairedJson = beforeLastEntry.substring(0, lastComma) + "]}";
            try {
              parsedResponse = JSON.parse(repairedJson);
            } catch (repairError) {
              console.error("Failed to repair truncated JSON:", repairError);
            }
          }
        }
      }

      if (!parsedResponse) {
        return NextResponse.json(
          {
            error: "Failed to parse OpenAI response",
            truncated: finishReason === "length",
            suggestion:
              finishReason === "length"
                ? "Try reducing maxPhrases or content size"
                : undefined,
          },
          { status: 500 }
        );
      }
    }

    // Validate the response structure (should always be valid with structured outputs)
    if (!parsedResponse.phrases || !Array.isArray(parsedResponse.phrases)) {
      return NextResponse.json(
        { error: "Invalid response structure from AI" },
        { status: 500 }
      );
    }

    // Filter and validate phrases (extra safety, though structured outputs should ensure this)
    const validPhrases = parsedResponse.phrases.filter(
      (phrase: any) =>
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
        // Get the authentication token and create authenticated client
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.substring(7);
        
        const authenticatedSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          }
        );

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
            truncated: finishReason === "length",
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
          content_length: content.length,
          show_id: showId || null,
          episode_id: episodeId || null,
          source: filename ? "file_upload" : "rtp",
          capture_timestamp: new Date().toISOString(),
          language,
          max_phrases: 1000, // Based on our extensive extraction
          total_phrases_found: validPhrases.length,
          was_truncated: finishReason === "length",
          extraction_params: {
            filename,
            showTitle,
            episodeTitle,
            seasonNumber,
            episodeNumber,
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
      truncated: finishReason === "length",
      extractionId,
      message:
        finishReason === "length"
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
