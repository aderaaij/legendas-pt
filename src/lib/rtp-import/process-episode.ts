/**
 * Process ONE RTP episode: scrape its subtitle, find/create the episode row, and
 * extract+save phrases via the internal `/api/extract-phrases` endpoint (authorized
 * with the service key). Extracted from the old monolithic `scrape-rtp` loop so it
 * can run as a single short serverless request per episode. SERVER-ONLY.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import RTPScraperService from "@/lib/rtp-scraper";
import { generateContentHash } from "@/utils/extractPhrasesUtils";
import type { EpisodeStep, PlanEpisode } from "./types";

export interface ProcessEpisodeParams {
  supabase: SupabaseClient; // service-role
  origin: string; // request origin, for the internal extract-phrases fetch
  episode: PlanEpisode;
  showId: string | null;
  season: number;
  seriesTitle: string;
  saveToDatabase: boolean;
  forceReExtraction: boolean;
  provider?: string | null;
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
    origin,
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

  // Dedup: skip if this exact content was already extracted (unless forcing).
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

  // Extract + save through the internal endpoint, authorized as a service call.
  await onStep?.("extracting");
  const extractionResponse = await fetch(`${origin}/api/extract-phrases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    },
    body: JSON.stringify({
      content: scrapedSubtitle.content,
      filename: scrapedSubtitle.filename,
      showTitle: seriesTitle,
      episodeTitle: episode.title,
      seasonNumber: season, // (the old loop hardcoded 1 here)
      episodeNumber: episode.episodeNumber,
      saveToDatabase,
      forceReExtraction,
      showId,
      episodeId,
      ...(provider ? { provider } : {}),
      ...(model ? { model } : {}),
    }),
  });

  if (!extractionResponse.ok) {
    let errorMsg = "Unknown extraction error";
    try {
      const errorData = await extractionResponse.json();
      errorMsg = errorData.error || errorMsg;
    } catch {
      // non-JSON error body
    }
    return { status: "extraction_failed", error: errorMsg };
  }

  await onStep?.("saving");
  const data = await extractionResponse.json();
  return {
    status: "success",
    extractionId: data.extractionId,
    phraseCount: data.phrases?.length ?? 0,
  };
}
