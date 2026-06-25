import TVDBService from "@/lib/tvdb";
import { supabase } from "@/lib/supabase-client";
import { Episode, Show } from "@/types/database";

export async function findOrCreateEpisode(
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
        await enrichEpisodeWithTVDB(
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
      air_date: tvdbEpisodeData.aired || new Date().toISOString().split("T")[0],
      ...tvdbEpisodeData,
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create episode: ${createError.message}`);
  }

  return newEpisode!;
}

export async function enrichEpisodeWithTVDB(
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

export async function getEpisodesForShow(showId: string): Promise<Episode[]> {
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

export async function updateEpisode(
  episodeId: string,
  updates: Partial<Omit<Episode, "id" | "show_id" | "created_at" | "updated_at">>
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

export async function fetchAndSaveEpisodesFromTVDB(
  show: Show
): Promise<Episode[]> {
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
