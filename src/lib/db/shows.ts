import TVDBService, { TVDBShow } from "@/lib/tvdb";
import { supabase } from "@/lib/supabase-client";
import { normalizeShowName } from "@/utils/slugify";
import { Show } from "@/types/database";

import { deleteExtraction } from "./extractions";

export async function findOrCreateShow(
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
      await enrichShowWithTVDB(exactMatch.id, name);

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
          await enrichShowWithTVDB(show.id, name);

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
    const { show: tvdbShow, confidence } = await TVDBService.findBestMatch(name);

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

export async function enrichShowWithTVDB(
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

export async function getAllShows(): Promise<Show[]> {
  const { data, error } = await supabase
    .from("shows")
    .select("*")
    .order("name");

  if (error) {
    throw new Error(`Failed to get shows: ${error.message}`);
  }

  return data || [];
}

export async function showHasPhraseExtractions(
  showId: string
): Promise<boolean> {
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

export async function createShowFromTVDB(tvdbShow: TVDBShow): Promise<Show> {
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

export async function updateShow(
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

export async function deleteShow(showId: string): Promise<void> {
  // Get all extractions for this show
  const { data: extractions, error: extractionsError } = await supabase
    .from("phrase_extractions")
    .select("id")
    .eq("show_id", showId);

  if (extractionsError) {
    throw new Error(`Failed to find extractions: ${extractionsError.message}`);
  }

  // Delete all extractions and their phrases
  for (const extraction of extractions || []) {
    await deleteExtraction(extraction.id);
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

export async function safeDeleteShow(
  showId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if show has phrase extractions
    const hasExtractions = await showHasPhraseExtractions(showId);

    if (hasExtractions) {
      return {
        success: false,
        message:
          "Cannot delete show with existing phrase extractions. Delete extractions first.",
      };
    }

    // Delete the show (episodes will be cascade deleted if foreign key is set up properly)
    await deleteShow(showId);

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
