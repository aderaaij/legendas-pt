/**
 * Process ONE series episode (RTP or RTVE): scrape its subtitle, find/create the
 * episode row, then extract + persist phrases by calling the scraper,
 * extractor, and persistence layers **directly** (no HTTP hop). This is the
 * worker's orchestration unit — it depends on no web server being reachable.
 * SERVER-ONLY (uses a service-role Supabase client).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSeriesSource } from "@/lib/sources";
import type { SeriesSourceId } from "@/lib/sources/meta";
import { extractFromSubtitle } from "@/lib/extractor";
import { persistExtraction } from "@/lib/db/extractions";
import { generateEpisodeEssentials } from "@/lib/essentials/generate";
import { reviewExtraction } from "@/lib/phrase-review/review-extraction";
import { MissingApiKeyError, UnknownProviderError } from "@/lib/llm/providers";
import { generateContentHash } from "@/utils/extractPhrasesUtils";
import type { Provider } from "@/lib/llm/types";
import type { EpisodeStep, PlanEpisode } from "./types";

export interface ProcessEpisodeParams {
  supabase: SupabaseClient; // service-role
  source: SeriesSourceId;
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
  essentialsCount?: number;
  essentialsError?: string;
  reviewFlagCount?: number;
  reviewError?: string;
}

export async function processEpisode(
  p: ProcessEpisodeParams
): Promise<ProcessEpisodeResult> {
  const {
    supabase,
    source,
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

  const seriesSource = getSeriesSource(source);
  const { language } = seriesSource.meta;
  // Marks the episode row as this source's episode so a re-import finds it.
  const episodeMarker = `${seriesSource.meta.label} Episode ID: ${episode.rtpId}`;

  await onStep?.("scraping");
  let scrapedSubtitle;
  try {
    scrapedSubtitle = await seriesSource.scrapeEpisodeSubtitle({
      id: episode.rtpId,
      url: episode.url,
      title: episode.title,
      episodeNumber: episode.episodeNumber,
      airDate: episode.airDate ?? "",
    });
  } catch (scrapeError) {
    // Network/API failure: retryable, unlike a missing subtitle.
    return {
      status: "error",
      error:
        scrapeError instanceof Error
          ? scrapeError.message
          : "Failed to fetch subtitle",
    };
  }
  if (!scrapedSubtitle) {
    return { status: "no_subtitle" };
  }

  // Find or create the episode row (by source episode id first, then season/number).
  let episodeId: string | null = null;
  if (saveToDatabase && showId) {
    const { data: existingByRtpId } = await supabase
      .from("episodes")
      .select("id")
      .eq("show_id", showId)
      .eq("description", episodeMarker)
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
          description: episodeMarker,
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

  // Pre-LLM dedup: skip the expensive extraction if this episode (or, without
  // an episode, this exact content) was already extracted, unless forcing. Uses
  // the same key persistExtraction dedups on — episode-scoped extractions store
  // a per-episode content hash, so matching the bare hash would never hit. Keeps
  // re-runs and duplicate imports cheap.
  if (saveToDatabase && !forceReExtraction) {
    const existingQuery = supabase.from("phrase_extractions").select("id");
    const { data: existingExtraction } = await (episodeId
      ? existingQuery.eq("episode_id", episodeId)
      : existingQuery.eq(
          "content_hash",
          generateContentHash(scrapedSubtitle.content)
        )
    )
      .limit(1)
      .maybeSingle();
    if (existingExtraction) {
      return { status: "already_exists", extractionId: existingExtraction.id };
    }
  }

  // Extract phrases (pure LLM layer — holds the keys, no DB).
  await onStep?.("extracting");
  let extraction;
  try {
    extraction = await extractFromSubtitle({
      content: scrapedSubtitle.content,
      language,
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

  let result;
  try {
    result = await persistExtraction(supabase, {
      phrases: extraction.phrases,
      content: scrapedSubtitle.content,
      language,
      source,
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
  } catch (saveError) {
    return {
      status: "extraction_failed",
      error:
        saveError instanceof Error ? saveError.message : "Failed to save extraction",
    };
  }

  if (result.alreadyExists) {
    return { status: "already_exists", extractionId: result.extractionId };
  }

  // Essentials: a second, much smaller LLM pass. Non-fatal and tried once — the
  // episode has already succeeded, and failing it here would trigger the episode
  // retry, which hits the dedup above and skips essentials anyway. The
  // essentials backfill job is the retry path.
  const essentials: Pick<ProcessEpisodeResult, "essentialsCount" | "essentialsError"> = {};
  if (episodeId) {
    await onStep?.("essentials");
    try {
      essentials.essentialsCount = await generateEpisodeEssentials(supabase, {
        episodeId,
        language,
        content: scrapedSubtitle.content,
        filename: scrapedSubtitle.filename,
        // No override: essentials resolve their own provider/model from env.
      });
    } catch (essentialsError) {
      essentials.essentialsError =
        essentialsError instanceof Error
          ? essentialsError.message
          : "Failed to pick essentials";
    }
  }

  // Translation review: a stronger model flags translations that would teach
  // the wrong meaning, for an admin to accept or reject on the episode edit
  // page. Non-fatal and tried once, like essentials.
  const review: Pick<ProcessEpisodeResult, "reviewFlagCount" | "reviewError"> = {};
  await onStep?.("reviewing");
  try {
    review.reviewFlagCount = await reviewExtraction(supabase, {
      extractionId: result.extractionId,
      language,
      content: scrapedSubtitle.content,
      filename: scrapedSubtitle.filename,
    });
  } catch (reviewError) {
    review.reviewError =
      reviewError instanceof Error ? reviewError.message : "Failed to review translations";
  }

  return {
    status: "success",
    extractionId: result.extractionId,
    phraseCount: extraction.phrases.length,
    ...essentials,
    ...review,
  };
}
