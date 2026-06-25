import { useState } from "react";

import { Show, Episode, PhraseExtractionService } from "@/lib/supabase";
import TVDBService, { TVDBSearchResult } from "@/lib/tvdb";

export interface ShowFormData {
  name: string;
  source: string;
  overview: string;
  network: string;
  genres: string;
  watch_url: string;
  poster_url: string;
}

export interface EpisodeFormData {
  title: string;
  season: number;
  episode_number: number;
  air_date: string;
  duration_minutes: number | null;
  description: string;
}

interface UseMetadataEditorParams {
  extractionId: string;
  currentShow?: Show;
  currentEpisode?: Episode;
  onUpdate: (show?: Show, episode?: Episode) => void;
  onClose: () => void;
}

/**
 * Owns the metadata editor's state and side effects: TVDB search, applying a
 * selected TVDB show/episode to the form, and persisting the show/episode plus
 * the extraction link on save.
 */
export function useMetadataEditor({
  extractionId,
  currentShow,
  currentEpisode,
  onUpdate,
  onClose,
}: UseMetadataEditorParams) {
  const [searchQuery, setSearchQuery] = useState(currentShow?.name || "");
  const [searchResults, setSearchResults] = useState<TVDBSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showData, setShowData] = useState<ShowFormData>({
    name: currentShow?.name || "",
    source: currentShow?.source || "rtp",
    overview: currentShow?.overview || "",
    network: currentShow?.network || "",
    genres: currentShow?.genres?.join(", ") || "",
    watch_url: currentShow?.watch_url || "",
    poster_url: currentShow?.poster_url || "",
  });

  const [episodeData, setEpisodeData] = useState<EpisodeFormData>({
    title: currentEpisode?.title || "",
    season: currentEpisode?.season || 1,
    episode_number: currentEpisode?.episode_number || 1,
    air_date: currentEpisode?.air_date || "",
    duration_minutes: currentEpisode?.duration_minutes || null,
    description: currentEpisode?.description || "",
  });

  const [selectedTVDBShow, setSelectedTVDBShow] =
    useState<TVDBSearchResult | null>(null);

  const updateShowData = (patch: Partial<ShowFormData>) =>
    setShowData((prev) => ({ ...prev, ...patch }));

  const updateEpisodeData = (patch: Partial<EpisodeFormData>) =>
    setEpisodeData((prev) => ({ ...prev, ...patch }));

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError("");
    try {
      const results = await TVDBService.searchShows(searchQuery);
      setSearchResults(results);
    } catch (err) {
      setError("Failed to search TVDB");
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const selectTVDBShow = async (tvdbShow: TVDBSearchResult) => {
    setSelectedTVDBShow(tvdbShow);

    try {
      // First, update with search result data (including image_url)
      setShowData((prev) => ({
        ...prev,
        name: tvdbShow.name,
        poster_url: tvdbShow.image_url || prev.poster_url,
      }));

      // Get full show details from TVDB
      const fullShow = await TVDBService.getShowDetails(
        parseInt(tvdbShow.tvdb_id)
      );

      if (fullShow) {
        setShowData((prev) => ({
          name: fullShow.name,
          source: prev.source,
          overview: fullShow.overview || "",
          network: fullShow.network || "",
          genres: fullShow.genres?.join(", ") || "",
          watch_url: prev.watch_url, // Keep existing watch_url when updating from TVDB
          poster_url: fullShow.image || tvdbShow.image_url || prev.poster_url, // Prefer full show image, fallback to search result
        }));

        // If we have episode info and TVDB show, try to get episode details
        if (episodeData.season && episodeData.episode_number) {
          const episodeDetails = await TVDBService.getEpisodeDetails(
            fullShow.id,
            episodeData.season,
            episodeData.episode_number
          );

          if (episodeDetails) {
            setEpisodeData((prev) => ({
              ...prev,
              title: episodeDetails.name || prev.title,
              air_date: episodeDetails.aired || prev.air_date,
              duration_minutes: episodeDetails.runtime || prev.duration_minutes,
              description: episodeDetails.overview || prev.description,
            }));
          }
        }
      }
    } catch (err) {
      console.error("Error fetching TVDB details:", err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      // First, update or create the show
      let updatedShow: Show;

      if (currentShow) {
        // Update existing show
        const updateData: any = {
          name: showData.name,
          source: showData.source,
          overview: showData.overview || null,
          network: showData.network || null,
          genres: showData.genres
            ? showData.genres
                .split(",")
                .map((g) => g.trim())
                .filter((g) => g.length > 0)
            : [],
          watch_url: showData.watch_url || null,
          poster_url: showData.poster_url || null,
        };

        // Only add TVDB fields if we have a valid selected show
        if (
          selectedTVDBShow &&
          selectedTVDBShow.objectID &&
          selectedTVDBShow.slug
        ) {
          updateData.tvdb_id = parseInt(selectedTVDBShow.objectID);
          updateData.tvdb_slug = selectedTVDBShow.slug;
        }

        updatedShow = await PhraseExtractionService.updateShow(
          currentShow.id,
          updateData
        );
      } else {
        // Create new show
        updatedShow = await PhraseExtractionService.findOrCreateShow(
          showData.name,
          showData.source
        );
      }

      // Update or create episode if we have episode data
      let updatedEpisode: Episode | undefined;
      if (episodeData.season && episodeData.episode_number) {
        if (currentEpisode) {
          updatedEpisode = await PhraseExtractionService.updateEpisode(
            currentEpisode.id,
            {
              title: episodeData.title,
              season: episodeData.season,
              episode_number: episodeData.episode_number,
              air_date: episodeData.air_date,
              duration_minutes: episodeData.duration_minutes || undefined,
              description: episodeData.description,
            }
          );
        } else {
          updatedEpisode = await PhraseExtractionService.findOrCreateEpisode(
            updatedShow.id,
            episodeData.season,
            episodeData.episode_number,
            episodeData.title
          );
        }

        // Update extraction to link to show and episode (only if we have a valid extraction ID)
        if (extractionId) {
          await PhraseExtractionService.updateExtraction(extractionId, {
            show_id: updatedShow.id,
            episode_id: updatedEpisode.id,
          });
        }
      } else {
        // Update extraction to link to show only (only if we have a valid extraction ID)
        if (extractionId) {
          await PhraseExtractionService.updateExtraction(extractionId, {
            show_id: updatedShow.id,
          });
        }
      }

      onUpdate(updatedShow, updatedEpisode);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save metadata: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    saving,
    error,
    showData,
    updateShowData,
    episodeData,
    updateEpisodeData,
    selectedTVDBShow,
    handleSearch,
    selectTVDBShow,
    handleSave,
  };
}
