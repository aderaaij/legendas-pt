import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractFromSubtitle } from "@/lib/extractor";
import { persistExtraction } from "@/lib/db/extractions";
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

    // Run the extraction through the pure extractor (subtitle parsing +
    // timestamp-matching + the provider-agnostic LLM layer). No DB here.
    let extraction;
    try {
      extraction = await extractFromSubtitle({
        content,
        filename,
        fileType,
        provider,
        model,
      });
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

    const { phrases, truncated, resolved } = extraction;
    if (truncated) {
      console.warn("Response was truncated due to token limit");
    }

    // Persist if requested, via the shared persistence seam (dedup + inserts).
    let extractionId: string | undefined;
    if (saveToDatabase) {
      try {
        const result = await persistExtraction(saveClient!, {
          phrases,
          content,
          language,
          truncated,
          forceReExtraction,
          showId,
          episodeId,
          provider: resolved.provider,
          model: resolved.model,
          filename,
          showTitle,
          episodeTitle,
          seasonNumber,
          episodeNumber,
        });

        if (result.alreadyExists) {
          return NextResponse.json({
            phrases,
            total: phrases.length,
            truncated,
            provider: resolved.provider,
            model: resolved.model,
            extractionId: result.extractionId,
            alreadyExists: true,
            message: episodeId
              ? "Episode already processed. Use forceReExtraction to override."
              : "Content already exists in database. Use forceReExtraction to override.",
          });
        }

        extractionId = result.extractionId;
      } catch (dbError) {
        console.error("Database save error:", dbError);
        return NextResponse.json(
          {
            error: "Failed to save to database",
            details: dbError instanceof Error ? dbError.message : "Unknown database error",
            phrases, // Still return the phrases even if save failed
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      phrases,
      total: phrases.length,
      truncated,
      provider: resolved.provider,
      model: resolved.model,
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
