// lib/supabase.ts
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

export interface PhraseExtraction {
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
    console.log("Searching for existing extraction with hash:", contentHash);

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
        console.log("No existing extraction found for hash:", contentHash);
        return null;
      } else {
        // Actual database error
        console.error("Database error searching for extraction:", error);
        throw new Error(`Database error: ${error.message}`);
      }
    }

    console.log("Found existing extraction:", data?.id);
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

  static async safeDeleteShow(showId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if show has phrase extractions
      const hasExtractions = await this.showHasPhraseExtractions(showId);
      
      if (hasExtractions) {
        return {
          success: false,
          message: "Cannot delete show with existing phrase extractions. Delete extractions first.",
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
        message: error instanceof Error ? error.message : "Failed to delete show",
      };
    }
  }
}
