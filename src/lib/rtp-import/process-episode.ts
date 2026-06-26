/**
 * Process ONE RTP episode: scrape its subtitle, find/create the episode row, then
 * extract + persist phrases by calling the scraper, extractor, and persistence
 * layers **directly** (no HTTP hop). This is the orchestration unit reused by
 * both the Next `/step` route and the standalone worker — it depends on no web
 * server being reachable. SERVER-ONLY (uses a service-role Supabase client).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import RTPScraperService from "@/lib/rtp-scraper";
import { extractFromSubtitle } from "@/lib/extractor";
import { persistExtraction } from "@/lib/db/extractions";
import { MissingApiKeyError, UnknownProviderError } from "@/lib/llm/providers";
import { generateContentHash } from "@/utils/extractPhrasesUtils";
import type { Provider } from "@/lib/llm/types";
import type { EpisodeStep, PlanEpisode } from "./types";

export interface ProcessEpisodeParams {
  supabase: SupabaseClient; // service-role
  episode: PlanEpisode;
  showId: string | null;
  season: number;
  seriesTitle: string;
  saveToDatabase: boolean;
  forceReExtraction: boolean;
  provider?: Provider | null;
  model?: string | null;
  onStep?: (step: EpisodeStep) => Promise<void> | void;
}

export interface ProcessEpisodeResult {
  status:
    | "success"
    | "already_exists"
    | "no_subtitle"
    | "extraction_failed"
    | "error";
  phraseCount?: number;
  extractionId?: string;
  error?: string;
}

export async function processEpisode(
  p: ProcessEpisodeParams
): Promise<ProcessEpisodeResult> {
  const {
    supabase,
    episode,
    showId,
    season,
    seriesTitle,
    saveToDatabase,
    forceReExtraction,
    provider,
    model,
    onStep,
  } = p;

  // Reconstruct the RTPEpisode shape the scraper expects.
  const rtpEpisode = {
    id: episode.rtpId,
    url: episode.url,
    title: episode.title,
    episodeNumber: episode.episodeNumber,
    airDate: episode.airDate ?? "",
  };

  await onStep?.("scraping");
  const scrapedSubtitle = await RTPScraperService.scrapeEpisodeSubtitle(
    rtpEpisode
  );
  if (!scrapedSubtitle) {
    return { status: "no_subtitle" };
  }

  // Pre-LLM dedup: skip the expensive extraction if this exact content was
  // already extracted (unless forcing). Keeps the unit cheaply retry-able.
  const contentHash = generateContentHash(scrapedSubtitle.content);
  if (saveToDatabase) {
    const { data: existingExtraction } = await supabase
      .from("phrase_extractions")
      .select("id")
      .eq("content_hash", contentHash)
      .single();
    if (existingExtraction && !forceReExtraction) {
      return { status: "already_exists", extractionId: existingExtraction.id };
    }
  }

  // Find or create the episode row (by RTP id first, then season/number).
  let episodeId: string | null = null;
  if (saveToDatabase && showId) {
    const { data: existingByRtpId } = await supabase
      .from("episodes")
      .select("id")
      .eq("show_id", showId)
      .eq("description", `RTP Episode ID: ${episode.rtpId}`)
      .single();

    const existingBySeason = !existingByRtpId
      ? (
          await supabase
            .from("episodes")
            .select("id")
            .eq("show_id", showId)
            .eq("season", season)
            .eq("episode_number", episode.episodeNumber)
            .single()
        ).data
      : null;

    const existingEpisode = existingByRtpId || existingBySeason;

    if (existingEpisode) {
      episodeId = existingEpisode.id;
    } else {
      const { data: newEpisode, error: episodeError } = await supabase
        .from("episodes")
        .insert({
          show_id: showId,
          season,
          episode_number: episode.episodeNumber,
          title: episode.title,
          air_date: episode.airDate || null,
          description: `RTP Episode ID: ${episode.rtpId}`,
        })
        .select("id")
        .single();

      if (episodeError) {
        return {
          status: "error",
          error: `Failed to create episode: ${episodeError.message}`,
        };
      }
      episodeId = newEpisode.id;
    }
  }

  // Extract phrases (pure LLM layer — holds the keys, no DB).
  await onStep?.("extracting");
  let extraction;
  try {
    extraction = await extractFromSubtitle({
      content: scrapedSubtitle.content,
      filename: scrapedSubtitle.filename,
      provider,
      model,
    });
  } catch (extractError) {
    if (
      extractError instanceof MissingApiKeyError ||
      extractError instanceof UnknownProviderError
    ) {
      return { status: "extraction_failed", error: extractError.message };
    }
    return {
      status: "extraction_failed",
      error:
        extractError instanceof Error
          ? extractError.message
          : "Failed to extract phrases",
    };
  }

  // Persist (all Supabase writes live here).
  await onStep?.("saving");
  if (!saveToDatabase) {
    return { status: "success", phraseCount: extraction.phrases.length };
  }

  try {
    const result = await persistExtraction(supabase, {
      phrases: extraction.phrases,
      content: scrapedSubtitle.content,
      language: "pt",
      truncated: extraction.truncated,
      forceReExtraction,
      showId,
      episodeId,
      provider: extraction.resolved.provider,
      model: extraction.resolved.model,
      filename: scrapedSubtitle.filename,
      showTitle: seriesTitle,
      episodeTitle: episode.title,
      seasonNumber: season,
      episodeNumber: episode.episodeNumber,
    });

    if (result.alreadyExists) {
      return { status: "already_exists", extractionId: result.extractionId };
    }
    return {
      status: "success",
      extractionId: result.extractionId,
      phraseCount: extraction.phrases.length,
    };
  } catch (saveError) {
    return {
      status: "extraction_failed",
      error:
        saveError instanceof Error ? saveError.message : "Failed to save extraction",
    };
  }
}
