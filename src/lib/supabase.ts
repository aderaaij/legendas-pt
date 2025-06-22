import { createClient } from "@supabase/supabase-js";
import TVDBService from "./tvdb";
import { normalizeShowName } from "../utils/slugify";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Types for your database schema
export interface Show {
  id: string;
  name: string;
  source: string;
  description?: string;
  genre?: string;
  language?: string;
  watch_url?: string;
  // TVDB fields
  tvdb_id?: number;
  tvdb_slug?: string;
  overview?: string;
  first_aired?: string;
  network?: string;
  status?: string;
  poster_url?: string;
  genres?: string[];
  rating?: number;
  tvdb_confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: string;
  show_id: string;
  season?: number;
  episode_number?: number;
  title?: string;
  air_date?: string;
  duration_minutes?: number;
  description?: string;
  // TVDB fields
  tvdb_id?: number;
  overview?: string;
  aired?: string;
  runtime?: number;
  episode_image?: string;
  created_at: string;
  updated_at: string;
}

interface PhraseExtraction {
  id: string;
  content_hash: string;
  content_preview?: string;
  content_length: number;
  show_id?: string;
  episode_id?: string;
  source: string;
  capture_timestamp: string;
  language: string;
  max_phrases: number;
  total_phrases_found: number;
  was_truncated: boolean;
  extraction_params?: Record<string, any>;
  processing_time_ms?: number;
  api_cost_estimate?: number;
  created_at: string;
  updated_at: string;
}

export interface ExtractedPhrase {
  id: string;
  extraction_id: string;
  phrase: string;
  translation: string;
  context?: string;
  confidence_score?: number;
  position_in_content?: number;
  created_at: string;
}

export interface ExtractionJob {
  id: string;
  user_id: string;
  job_type: "rtp_series" | "manual_upload";
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number; // 0-100
  total_episodes: number;
  completed_episodes: number;
  failed_episodes: number;
  series_title?: string;
  series_url?: string;
  current_episode?: string;
  error_message?: string;
  results?: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// Helper functions for database operations
export class PhraseExtractionService {
  static async findOrCreateShow(
    name: string,
    source: string = "rtp"
  ): Promise<Show> {
    // First try exact match

    const { data: exactMatch, error: exactError } = await supabase
      .from("shows")
      .select("*")
      .eq("name", name)
      .eq("source", source)
      .single();

    if (exactMatch && !exactError) {
      // If show exists but doesn't have TVDB data, try to enrich it
      if (!exactMatch.tvdb_id) {
        await this.enrichShowWithTVDB(exactMatch.id, name);

        // Fetch the updated show data
        const { data: updatedShow } = await supabase
          .from("shows")
          .select("*")
          .eq("id", exactMatch.id)
          .single();

        return updatedShow || exactMatch;
      }
      return exactMatch;
    }

    // If no exact match, try normalized name matching
    const normalizedSearchName = normalizeShowName(name);
    const { data: allShows } = await supabase
      .from("shows")
      .select("*")
      .eq("source", source);

    if (allShows) {
      for (const show of allShows) {
        const normalizedShowName = normalizeShowName(show.name);
        if (normalizedShowName === normalizedSearchName) {
          // Found a match with normalized names
          if (!show.tvdb_id) {
            await this.enrichShowWithTVDB(show.id, name);

            // Fetch the updated show data
            const { data: updatedShow } = await supabase
              .from("shows")
              .select("*")
              .eq("id", show.id)
              .single();

            return updatedShow || show;
          }
          return show;
        }
      }
    }

    // Create new show with TVDB lookup

    // Try to get TVDB data
    let tvdbData: Partial<Show> = {};
    try {
      const { show: tvdbShow, confidence } = await TVDBService.findBestMatch(
        name
      );

      if (tvdbShow && confidence > 0.6) {
        tvdbData = {
          tvdb_id: tvdbShow.id,
          tvdb_slug: tvdbShow.slug,
          overview: tvdbShow.overview,
          first_aired: tvdbShow.firstAired,
          network: tvdbShow.network,
          status: tvdbShow.status,
          poster_url: tvdbShow.image,
          genres: tvdbShow.genres,
          rating: tvdbShow.rating,
          tvdb_confidence: confidence,
        };
      } else {
      }
    } catch (error) {
      console.error("TVDB lookup failed:", error);
    }

    const { data: newShow, error: createError } = await supabase
      .from("shows")
      .insert({
        name,
        source,
        language: "pt",
        ...tvdbData,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create show: ${createError.message}`);
    }

    return newShow!;
  }

  static async enrichShowWithTVDB(
    showId: string,
    showName: string
  ): Promise<void> {
    try {
      const { show: tvdbShow, confidence } = await TVDBService.findBestMatch(
        showName
      );

      if (tvdbShow && confidence > 0.6) {
        const { error } = await supabase
          .from("shows")
          .update({
            tvdb_id: tvdbShow.id,
            tvdb_slug: tvdbShow.slug,
            overview: tvdbShow.overview,
            first_aired: tvdbShow.firstAired,
            network: tvdbShow.network,
            status: tvdbShow.status,
            poster_url: tvdbShow.image,
            genres: tvdbShow.genres,
            rating: tvdbShow.rating,
            tvdb_confidence: confidence,
          })
          .eq("id", showId);

        if (error) {
          console.error("Failed to update show with TVDB data:", error);
        } else {
        }
      }
    } catch (error) {
      console.error("Error enriching show with TVDB:", error);
    }
  }

  static async findOrCreateEpisode(
    showId: string,
    season?: number,
    episodeNumber?: number,
    title?: string
  ): Promise<Episode> {
    if (season && episodeNumber) {
      const { data: existingEpisode, error: findError } = await supabase
        .from("episodes")
        .select("*")
        .eq("show_id", showId)
        .eq("season", season)
        .eq("episode_number", episodeNumber)
        .single();

      if (existingEpisode && !findError) {
        // If episode exists but doesn't have TVDB data, try to enrich it
        if (!existingEpisode.tvdb_id) {
          await this.enrichEpisodeWithTVDB(
            existingEpisode.id,
            showId,
            season,
            episodeNumber
          );

          // Fetch updated episode data
          const { data: updatedEpisode } = await supabase
            .from("episodes")
            .select("*")
            .eq("id", existingEpisode.id)
            .single();

          return updatedEpisode || existingEpisode;
        }
        return existingEpisode;
      }
    }

    // Try to get TVDB episode data if we have show TVDB ID
    let tvdbEpisodeData: Partial<Episode> = {};
    if (season && episodeNumber) {
      try {
        // Get show TVDB ID
        const { data: show } = await supabase
          .from("shows")
          .select("tvdb_id")
          .eq("id", showId)
          .single();

        if (show?.tvdb_id) {
          const tvdbEpisode = await TVDBService.getEpisodeDetails(
            show.tvdb_id,
            season,
            episodeNumber
          );

          if (tvdbEpisode) {
            tvdbEpisodeData = {
              tvdb_id: tvdbEpisode.id,
              title: tvdbEpisode.name || title,
              overview: tvdbEpisode.overview,
              aired: tvdbEpisode.aired,
              runtime: tvdbEpisode.runtime,
              episode_image: tvdbEpisode.image,
            };
          }
        }
      } catch (error) {
        console.error("TVDB episode lookup failed:", error);
      }
    }

    const { data: newEpisode, error: createError } = await supabase
      .from("episodes")
      .insert({
        show_id: showId,
        season,
        episode_number: episodeNumber,
        title: tvdbEpisodeData.title || title,
        air_date:
          tvdbEpisodeData.aired || new Date().toISOString().split("T")[0],
        ...tvdbEpisodeData,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create episode: ${createError.message}`);
    }

    return newEpisode!;
  }

  static async enrichEpisodeWithTVDB(
    episodeId: string,
    showId: string,
    season: number,
    episodeNumber: number
  ): Promise<void> {
    try {
      // Get show TVDB ID
      const { data: show } = await supabase
        .from("shows")
        .select("tvdb_id")
        .eq("id", showId)
        .single();

      if (!show?.tvdb_id) {
        return;
      }

      const tvdbEpisode = await TVDBService.getEpisodeDetails(
        show.tvdb_id,
        season,
        episodeNumber
      );

      if (tvdbEpisode) {
        const { error } = await supabase
          .from("episodes")
          .update({
            tvdb_id: tvdbEpisode.id,
            title: tvdbEpisode.name,
            overview: tvdbEpisode.overview,
            aired: tvdbEpisode.aired,
            runtime: tvdbEpisode.runtime,
            episode_image: tvdbEpisode.image,
          })
          .eq("id", episodeId);

        if (error) {
          console.error("Failed to update episode with TVDB data:", error);
        } else {
        }
      }
    } catch (error) {
      console.error("Error enriching episode with TVDB:", error);
    }
  }

  static async findExistingExtraction(
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

  static async getExtractedPhrases(
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

  static async saveExtraction(
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

  // Search functionality
  static async searchPhrases(
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
  static async getExtractionStats() {
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

  // Delete methods
  static async deleteExtraction(extractionId: string): Promise<void> {
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
      throw new Error(
        `Failed to delete extraction: ${extractionError.message}`
      );
    }
  }

  static async deleteShow(showId: string): Promise<void> {
    // Get all extractions for this show
    const { data: extractions, error: extractionsError } = await supabase
      .from("phrase_extractions")
      .select("id")
      .eq("show_id", showId);

    if (extractionsError) {
      throw new Error(
        `Failed to find extractions: ${extractionsError.message}`
      );
    }

    // Delete all extractions and their phrases
    for (const extraction of extractions || []) {
      await this.deleteExtraction(extraction.id);
    }

    // Delete all episodes for this show
    const { error: episodesError } = await supabase
      .from("episodes")
      .delete()
      .eq("show_id", showId);

    if (episodesError) {
      console.error("Failed to delete episodes:", episodesError);
    }

    // Finally delete the show
    const { error: showError } = await supabase
      .from("shows")
      .delete()
      .eq("id", showId);

    if (showError) {
      throw new Error(`Failed to delete show: ${showError.message}`);
    }
  }

  // Update methods for metadata editing
  static async updateShow(
    showId: string,
    updates: Partial<Omit<Show, "id" | "created_at" | "updated_at">>
  ): Promise<Show> {
    const { data, error } = await supabase
      .from("shows")
      .update(updates)
      .eq("id", showId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update show: ${error.message}`);
    }

    return data;
  }

  static async updateEpisode(
    episodeId: string,
    updates: Partial<
      Omit<Episode, "id" | "show_id" | "created_at" | "updated_at">
    >
  ): Promise<Episode> {
    const { data, error } = await supabase
      .from("episodes")
      .update(updates)
      .eq("id", episodeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update episode: ${error.message}`);
    }

    return data;
  }

  static async updateExtraction(
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

  // Get extraction with full metadata
  static async getExtractionWithMetadata(
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

  // Show management methods for ShowSelector
  static async getAllShows(): Promise<Show[]> {
    const { data, error } = await supabase
      .from("shows")
      .select("*")
      .order("name");

    if (error) {
      throw new Error(`Failed to get shows: ${error.message}`);
    }

    return data || [];
  }

  static async showHasPhraseExtractions(showId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("phrase_extractions")
      .select("id")
      .eq("show_id", showId)
      .limit(1);

    if (error) {
      console.error("Error checking phrase extractions:", error);
      return false;
    }

    return (data?.length || 0) > 0;
  }

  static async getEpisodesForShow(showId: string): Promise<Episode[]> {
    const { data, error } = await supabase
      .from("episodes")
      .select("*")
      .eq("show_id", showId)
      .order("season", { ascending: true })
      .order("episode_number", { ascending: true });

    if (error) {
      throw new Error(`Failed to get episodes: ${error.message}`);
    }

    return data || [];
  }

  static async createShowFromTVDB(tvdbShow: any): Promise<Show> {
    const { data, error } = await supabase
      .from("shows")
      .insert({
        name: tvdbShow.name,
        source: "tvdb",
        language: "pt",
        tvdb_id: tvdbShow.id,
        tvdb_slug: tvdbShow.slug,
        overview: tvdbShow.overview,
        first_aired: tvdbShow.firstAired,
        network: tvdbShow.network,
        status: tvdbShow.status,
        poster_url: tvdbShow.image,
        genres: tvdbShow.genres,
        rating: tvdbShow.rating,
        tvdb_confidence: 1.0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create show: ${error.message}`);
    }

    return data!;
  }

  static async fetchAndSaveEpisodesFromTVDB(show: Show): Promise<Episode[]> {
    if (!show.tvdb_id) {
      throw new Error("Show does not have TVDB ID");
    }

    try {
      // Fetch episodes from TVDB
      const tvdbEpisodes = await TVDBService.getAllEpisodes(show.tvdb_id);

      if (!tvdbEpisodes || tvdbEpisodes.length === 0) {
        return [];
      }

      // Prepare episodes for database insertion
      const episodesToInsert = tvdbEpisodes.map((tvdbEpisode) => ({
        show_id: show.id,
        season: tvdbEpisode.seasonNumber,
        episode_number: tvdbEpisode.number,
        title: tvdbEpisode.name,
        air_date: tvdbEpisode.aired,
        duration_minutes: tvdbEpisode.runtime,
        description: tvdbEpisode.overview,
        tvdb_id: tvdbEpisode.id,
        overview: tvdbEpisode.overview,
        aired: tvdbEpisode.aired,
        runtime: tvdbEpisode.runtime,
        episode_image: tvdbEpisode.image,
      }));

      // Use upsert to handle duplicates
      const { data, error } = await supabase
        .from("episodes")
        .upsert(episodesToInsert, {
          onConflict: "show_id,season,episode_number",
        })
        .select();

      if (error) {
        throw new Error(`Failed to save episodes: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching episodes from TVDB:", error);
      throw error;
    }
  }

  static async safeDeleteShow(
    showId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if show has phrase extractions
      const hasExtractions = await this.showHasPhraseExtractions(showId);

      if (hasExtractions) {
        return {
          success: false,
          message:
            "Cannot delete show with existing phrase extractions. Delete extractions first.",
        };
      }

      // Delete the show (episodes will be cascade deleted if foreign key is set up properly)
      await this.deleteShow(showId);

      return {
        success: true,
        message: "Show deleted successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to delete show",
      };
    }
  }

  // Get shows with their extraction statistics for homepage
  static async getShowsWithExtractionStats() {
    // First get all shows

    const { data: shows, error: showsError } = await supabase
      .from("shows")
      .select("*")
      .order("name");

    if (showsError) {
      throw new Error(`Failed to get shows: ${showsError.message}`);
    }

    if (!shows || shows.length === 0) {
      return [];
    }

    // Get extraction counts and current phrase counts for each show
    const showsWithStats = await Promise.all(
      shows.map(async (show) => {
        const { data: extractions, error: extractionsError } = await supabase
          .from("phrase_extractions")
          .select("id, created_at")
          .eq("show_id", show.id)
          .order("created_at", { ascending: false });

        if (extractionsError) {
          console.error(
            `Error getting extractions for show ${show.id}:`,
            extractionsError
          );
          return null;
        }

        const extractionCount = extractions?.length || 0;

        // Get current phrase count by counting actual phrases
        let totalPhrases = 0;
        if (extractions && extractions.length > 0) {
          for (const extraction of extractions) {
            const { data: phrases } = await supabase
              .from("extracted_phrases")
              .select("id")
              .eq("extraction_id", extraction.id);
            totalPhrases += phrases?.length || 0;
          }
        }

        const lastExtraction = extractions?.[0]?.created_at || show.created_at;

        // Only return shows that have extractions
        if (extractionCount > 0) {
          return {
            id: show.id,
            name: show.name,
            source: show.source,
            extractionCount,
            totalPhrases,
            lastExtraction,
            network: show.network,
            rating: show.rating,
            poster_url: show.poster_url,
            tvdb_confidence: show.tvdb_confidence,
          };
        }

        return null;
      })
    );

    // Filter out null results and sort by last extraction date
    return showsWithStats
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b!.lastExtraction).getTime() -
          new Date(a!.lastExtraction).getTime()
      ) as Array<{
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
    }>;
  }

  // Get episodes for a show with their extraction statistics
  static async getEpisodesWithExtractionStats(showId: string) {
    const { data: episodes, error: episodesError } = await supabase
      .from("episodes")
      .select("*")
      .eq("show_id", showId)
      .order("season", { ascending: true })
      .order("episode_number", { ascending: true });

    if (episodesError) {
      throw new Error(`Failed to get episodes: ${episodesError.message}`);
    }

    if (!episodes || episodes.length === 0) {
      return [];
    }

    // Get extraction counts and current phrase counts for each episode
    const episodesWithStats = await Promise.all(
      episodes.map(async (episode) => {
        const { data: extractions, error: extractionsError } = await supabase
          .from("phrase_extractions")
          .select("id, created_at")
          .eq("episode_id", episode.id)
          .order("created_at", { ascending: false });

        if (extractionsError) {
          console.error(
            `Error getting extractions for episode ${episode.id}:`,
            extractionsError
          );
          return {
            ...episode,
            extractionCount: 0,
            totalPhrases: 0,
            lastExtraction: null,
          };
        }

        const extractionCount = extractions?.length || 0;

        // Get current phrase count by counting actual phrases
        let totalPhrases = 0;
        if (extractions && extractions.length > 0) {
          for (const extraction of extractions) {
            const { data: phrases } = await supabase
              .from("extracted_phrases")
              .select("id")
              .eq("extraction_id", extraction.id);
            totalPhrases += phrases?.length || 0;
          }
        }

        const lastExtraction = extractions?.[0]?.created_at || null;

        return {
          ...episode,
          extractionCount,
          totalPhrases,
          lastExtraction,
        };
      })
    );

    // Only return episodes that have extractions
    return episodesWithStats.filter((ep) => ep.extractionCount > 0);
  }

  // Get phrases for a specific episode
  static async getPhrasesForEpisode(episodeId: string) {
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
        const phrases = await this.getExtractedPhrases(extraction.id);
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
  static async getPhrasesForShow(showId: string) {
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
        const phrases = await this.getExtractedPhrases(extraction.id);
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

  // Job Management Methods
  static async createExtractionJob(
    userId: string,
    jobType: "rtp_series" | "manual_upload",
    seriesTitle?: string,
    seriesUrl?: string,
    totalEpisodes: number = 0,
    authenticatedSupabase?: any
  ): Promise<ExtractionJob> {
    const client = authenticatedSupabase || supabase;
    const { data, error } = await client
      .from("extraction_jobs")
      .insert({
        user_id: userId,
        job_type: jobType,
        status: "pending",
        progress: 0,
        total_episodes: totalEpisodes,
        completed_episodes: 0,
        failed_episodes: 0,
        series_title: seriesTitle,
        series_url: seriesUrl,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error creating extraction job:", error);
      throw new Error(
        `Failed to create extraction job: ${
          error.message || "Database table may not exist"
        }`
      );
    }

    return data;
  }

  static async updateExtractionJob(
    jobId: string,
    updates: Partial<
      Pick<
        ExtractionJob,
        | "status"
        | "progress"
        | "completed_episodes"
        | "failed_episodes"
        | "current_episode"
        | "error_message"
        | "results"
        | "completed_at"
      >
    >,
    authenticatedSupabase?: any
  ): Promise<ExtractionJob> {
    const client = authenticatedSupabase || supabase;
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from("extraction_jobs")
      .update(updateData)
      .eq("id", jobId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update extraction job: ${error.message}`);
    }

    return data;
  }

  static async getExtractionJob(
    jobId: string,
    authenticatedSupabase?: any
  ): Promise<ExtractionJob | null> {
    const client = authenticatedSupabase || supabase;
    const { data, error } = await client
      .from("extraction_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Job not found
      }
      throw new Error(`Failed to get extraction job: ${error.message}`);
    }

    return data;
  }

  static async getUserExtractionJobs(
    userId: string,
    limit: number = 10
  ): Promise<ExtractionJob[]> {
    const { data, error } = await supabase
      .from("extraction_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get user extraction jobs: ${error.message}`);
    }

    return data || [];
  }

  static async getActiveExtractionJobs(
    userId: string
  ): Promise<ExtractionJob[]> {
    const { data, error } = await supabase
      .from("extraction_jobs")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["pending", "running"])
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get active extraction jobs: ${error.message}`);
    }

    return data || [];
  }

  static async cancelExtractionJob(jobId: string): Promise<ExtractionJob> {
    return this.updateExtractionJob(jobId, {
      status: "cancelled",
      completed_at: new Date().toISOString(),
    });
  }

  // Delete a specific phrase
  static async deletePhrase(phraseId: string): Promise<void> {
    const { error } = await supabase
      .from("extracted_phrases")
      .delete()
      .eq("id", phraseId);

    if (error) {
      throw new Error(`Failed to delete phrase: ${error.message}`);
    }
  }

  // Update a specific phrase
  static async updatePhrase(
    phraseId: string,
    updates: Partial<
      Omit<ExtractedPhrase, "id" | "extraction_id" | "created_at">
    >
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
  static async addPhrase(
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

  // Find duplicate phrases within an extraction
  static async findDuplicatePhrasesInExtraction(extractionId: string): Promise<{
    duplicateGroups: Array<{
      normalizedPhrase: string;
      phrases: ExtractedPhrase[];
    }>;
    totalDuplicates: number;
  }> {
    const phrases = await this.getExtractedPhrases(extractionId);

    // Group phrases by normalized version (lowercase, trimmed, punctuation removed)
    const phraseGroups = new Map<string, ExtractedPhrase[]>();

    for (const phrase of phrases) {
      const normalized = this.normalizePhrase(phrase.phrase);
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

  // Normalize phrase for comparison (remove case, punctuation, extra spaces)
  private static normalizePhrase(phrase: string): string {
    return phrase
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();
  }

  // Merge multiple phrases into one, keeping the best translation
  static async mergePhrases(
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
    const updatedPhrase = await this.updatePhrase(primaryPhrase.id, {
      phrase: selectedPhrase,
      translation: selectedTranslation,
      // Keep the earliest position
      position_in_content: primaryPhrase.position_in_content,
    });

    // Delete all other phrases
    const phrasesToDelete = phrasesToMerge.filter(
      (p) => p.id !== primaryPhrase.id
    );
    await Promise.all(
      phrasesToDelete.map((phrase) => this.deletePhrase(phrase.id))
    );

    return updatedPhrase;
  }

  // Get phrases with duplicate analysis for an extraction
  static async getPhrasesWithDuplicateAnalysis(extractionId: string): Promise<{
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
    const phrases = await this.getExtractedPhrases(extractionId);
    const { duplicateGroups } = await this.findDuplicatePhrasesInExtraction(
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

  // Merge two shows by moving all data from duplicate to primary show
  static async mergeShows(
    primaryShowId: string,
    duplicateShowId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate that both shows exist
      const [primaryShow, duplicateShow] = await Promise.all([
        supabase.from("shows").select("*").eq("id", primaryShowId).single(),
        supabase.from("shows").select("*").eq("id", duplicateShowId).single(),
      ]);

      if (primaryShow.error) {
        return { success: false, message: "Primary show not found" };
      }
      if (duplicateShow.error) {
        return { success: false, message: "Duplicate show not found" };
      }

      // Check for conflicts - episodes with same season/episode numbers
      const [primaryEpisodes, duplicateEpisodes] = await Promise.all([
        supabase
          .from("episodes")
          .select("season, episode_number")
          .eq("show_id", primaryShowId),
        supabase
          .from("episodes")
          .select("season, episode_number")
          .eq("show_id", duplicateShowId),
      ]);

      if (primaryEpisodes.data && duplicateEpisodes.data) {
        const primaryEpKeys = new Set(
          primaryEpisodes.data.map((ep) => `${ep.season}-${ep.episode_number}`)
        );
        const conflicts = duplicateEpisodes.data.filter((ep) =>
          primaryEpKeys.has(`${ep.season}-${ep.episode_number}`)
        );

        if (conflicts.length > 0) {
          return {
            success: false,
            message: `Cannot merge: ${conflicts.length} episodes would conflict (same season/episode numbers)`,
          };
        }
      }

      // Move all phrase extractions to primary show
      const { error: extractionsError } = await supabase
        .from("phrase_extractions")
        .update({ show_id: primaryShowId })
        .eq("show_id", duplicateShowId);

      if (extractionsError) {
        return {
          success: false,
          message: `Failed to move extractions: ${extractionsError.message}`,
        };
      }

      // Move all episodes to primary show
      const { error: episodesError } = await supabase
        .from("episodes")
        .update({ show_id: primaryShowId })
        .eq("show_id", duplicateShowId);

      if (episodesError) {
        return {
          success: false,
          message: `Failed to move episodes: ${episodesError.message}`,
        };
      }

      // Delete the duplicate show
      await this.deleteShow(duplicateShowId);

      return {
        success: true,
        message: `Successfully merged "${duplicateShow.data.name}" into "${primaryShow.data.name}"`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Merge failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  // Find potentially duplicate shows by name similarity
  static async findDuplicateShows(): Promise<
    Array<{
      normalizedName: string;
      shows: Show[];
    }>
  > {
    const { data: allShows, error } = await supabase
      .from("shows")
      .select("*")
      .order("name");

    console.log(allShows);

    if (error || !allShows) {
      return [];
    }

    // Group shows by normalized name
    const showGroups = new Map<string, Show[]>();

    for (const show of allShows) {
      const normalized = normalizeShowName(show.name);
      if (!showGroups.has(normalized)) {
        showGroups.set(normalized, []);
      }
      showGroups.get(normalized)!.push(show);
    }

    // Return only groups with potential duplicates
    return Array.from(showGroups.entries())
      .filter(([_, shows]) => shows.length > 1)
      .map(([normalizedName, shows]) => ({
        normalizedName,
        shows: shows.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }
}
