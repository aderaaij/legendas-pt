import { supabase } from "@/lib/supabase-client";
import { normalizeShowName } from "@/utils/slugify";
import { Show } from "@/types/database";

import { deleteShow } from "./shows";

// Merge two shows by moving all data from duplicate to primary show
export async function mergeShows(
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
    await deleteShow(duplicateShowId);

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
export async function findDuplicateShows(): Promise<
  Array<{
    normalizedName: string;
    shows: Show[];
  }>
> {
  const { data: allShows, error } = await supabase
    .from("shows")
    .select("*")
    .order("name");

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
