import { supabase } from "@/lib/supabase-client";
import { LibraryShow } from "@/types/database";

import { getAllShows } from "./shows";

// Row shapes returned by the get_*_with_extraction_stats SQL functions. The
// numeric aggregates come back as strings and are parsed with parseInt below.
interface RpcShowStat {
  id: string;
  name: string;
  source: string;
  extraction_count: string;
  total_phrases: string;
  last_extraction: string;
  network?: string;
  rating?: number;
  poster_url?: string;
  tvdb_confidence?: number;
}

interface RpcEpisodeStat {
  id: string;
  show_id: string;
  season?: number;
  episode_number?: number;
  title?: string;
  air_date?: string;
  duration_minutes?: number;
  description?: string;
  tvdb_id?: number;
  overview?: string;
  aired?: string;
  runtime?: number;
  episode_image?: string;
  created_at: string;
  updated_at: string;
  extraction_count: string;
  total_phrases: string;
  last_extraction: string;
}

// Get shows with their extraction statistics for homepage
export async function getShowsWithExtractionStats() {
  // Try to use optimized database function first
  const { data, error } = await supabase.rpc("get_shows_with_extraction_stats");

  if (error && error.message?.includes("Could not find the function")) {
    console.warn(
      "Database function not found, falling back to aggregated query. Please run the SQL from database-functions.sql"
    );

    // Fallback to optimized aggregated query (much better than the original N+1 approach)
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("shows")
      .select(
        `
        id,
        name,
        source,
        network,
        rating,
        poster_url,
        tvdb_confidence,
        created_at,
        phrase_extractions!show_id (
          id,
          created_at
        )
      `
      )
      .order("name");

    if (fallbackError) {
      throw new Error(`Failed to get shows: ${fallbackError.message}`);
    }

    if (!fallbackData || fallbackData.length === 0) {
      return [];
    }

    // For each show, get phrase counts using a single aggregated query
    const showsWithStats = await Promise.all(
      fallbackData
        .filter((show) => show.phrase_extractions?.length > 0)
        .map(async (show) => {
          // Get phrase count for all extractions of this show in one query
          const { count: phraseCount } = await supabase
            .from("extracted_phrases")
            .select("id", { count: "exact" })
            .in(
              "extraction_id",
              show.phrase_extractions.map((ext: { id: string }) => ext.id)
            );

          const extractions = show.phrase_extractions || [];
          const lastExtraction =
            extractions.length > 0
              ? extractions.reduce(
                  (latest: string, extraction: { created_at: string }) =>
                    new Date(extraction.created_at) > new Date(latest)
                      ? extraction.created_at
                      : latest,
                  extractions[0].created_at
                )
              : show.created_at;

          return {
            id: show.id,
            name: show.name,
            source: show.source,
            extractionCount: extractions.length,
            totalPhrases: phraseCount || 0,
            lastExtraction,
            network: show.network,
            rating: show.rating,
            poster_url: show.poster_url,
            tvdb_confidence: show.tvdb_confidence,
          };
        })
    );

    return showsWithStats.sort(
      (a, b) =>
        new Date(b.lastExtraction).getTime() -
        new Date(a.lastExtraction).getTime()
    );
  }

  if (error) {
    throw new Error(`Failed to get shows: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Transform the database function result to match expected interface
  return data.map((show: RpcShowStat) => ({
    id: show.id,
    name: show.name,
    source: show.source,
    extractionCount: parseInt(show.extraction_count),
    totalPhrases: parseInt(show.total_phrases),
    lastExtraction: show.last_extraction,
    network: show.network,
    rating: show.rating,
    poster_url: show.poster_url,
    tvdb_confidence: show.tvdb_confidence,
  }));
}

// Get shows that have extractions, enriched with full show metadata.
// Used by the CENA library view which needs blurb/genres/year alongside
// the phrase/extraction counts.
export async function getLibraryShows(): Promise<LibraryShow[]> {
  const [stats, allShows] = await Promise.all([
    getShowsWithExtractionStats(),
    getAllShows(),
  ]);

  const byId = new Map(allShows.map((show) => [show.id, show]));

  // getShowsWithExtractionStats() has an inferred `any` return; describe the
  // element shape we rely on so the merge below stays type-safe.
  type StatShow = {
    id: string;
    name: string;
    source: string;
    extractionCount: number;
    totalPhrases: number;
    lastExtraction: string;
    network?: string;
    rating?: number;
    poster_url?: string;
    tvdb_confidence?: number;
  };

  return (stats as StatShow[]).map((s) => {
    const full = byId.get(s.id);
    return {
      id: s.id,
      name: s.name,
      source: s.source,
      extractionCount: s.extractionCount,
      totalPhrases: s.totalPhrases,
      lastExtraction: s.lastExtraction,
      network: s.network ?? full?.network,
      rating: s.rating ?? full?.rating,
      poster_url: s.poster_url ?? full?.poster_url,
      tvdb_confidence: s.tvdb_confidence ?? full?.tvdb_confidence,
      overview: full?.overview,
      description: full?.description,
      first_aired: full?.first_aired,
      genre: full?.genre,
      genres: full?.genres,
      status: full?.status,
      watch_url: full?.watch_url,
    };
  });
}

// Get episodes for a show with their extraction statistics
export async function getEpisodesWithExtractionStats(showId: string) {
  // Try to use optimized database function first
  const { data, error } = await supabase.rpc(
    "get_episodes_with_extraction_stats",
    {
      show_id_param: showId,
    }
  );

  if (error && error.message?.includes("Could not find the function")) {
    console.warn(
      "Database function not found, falling back to aggregated query. Please run the SQL from database-functions.sql"
    );

    // Fallback to optimized aggregated query
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("episodes")
      .select(
        `
        *,
        phrase_extractions!episode_id (
          id,
          created_at
        )
      `
      )
      .eq("show_id", showId)
      .order("season", { ascending: true })
      .order("episode_number", { ascending: true });

    if (fallbackError) {
      throw new Error(`Failed to get episodes: ${fallbackError.message}`);
    }

    if (!fallbackData || fallbackData.length === 0) {
      return [];
    }

    // For each episode, get phrase counts using a single aggregated query
    const episodesWithStats = await Promise.all(
      fallbackData
        .filter((episode) => episode.phrase_extractions?.length > 0)
        .map(async (episode) => {
          // Get phrase count for all extractions of this episode in one query
          const { count: phraseCount } = await supabase
            .from("extracted_phrases")
            .select("id", { count: "exact" })
            .in(
              "extraction_id",
              episode.phrase_extractions.map((ext: { id: string }) => ext.id)
            );

          const extractions = episode.phrase_extractions || [];
          const lastExtraction =
            extractions.length > 0
              ? extractions.reduce(
                  (latest: string, extraction: { created_at: string }) =>
                    new Date(extraction.created_at) > new Date(latest)
                      ? extraction.created_at
                      : latest,
                  extractions[0].created_at
                )
              : null;

          // Remove the nested data from the episode object before returning
          const { phrase_extractions: _phrase_extractions, ...episodeData } =
            episode;

          return {
            ...episodeData,
            extractionCount: extractions.length,
            totalPhrases: phraseCount || 0,
            lastExtraction,
          };
        })
    );

    return episodesWithStats;
  }

  if (error) {
    throw new Error(`Failed to get episodes: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Transform the database function result to match expected interface
  return data.map((episode: RpcEpisodeStat) => ({
    id: episode.id,
    show_id: episode.show_id,
    season: episode.season,
    episode_number: episode.episode_number,
    title: episode.title,
    air_date: episode.air_date,
    duration_minutes: episode.duration_minutes,
    description: episode.description,
    tvdb_id: episode.tvdb_id,
    overview: episode.overview,
    aired: episode.aired,
    runtime: episode.runtime,
    episode_image: episode.episode_image,
    created_at: episode.created_at,
    updated_at: episode.updated_at,
    extractionCount: parseInt(episode.extraction_count),
    totalPhrases: parseInt(episode.total_phrases),
    lastExtraction: episode.last_extraction,
  }));
}
