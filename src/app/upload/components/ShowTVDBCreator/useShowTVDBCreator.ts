import { useState } from "react";

import { Show } from "@/lib/supabase";
import TVDBService, { TVDBSearchResult } from "@/lib/tvdb";

export interface EpisodePreview {
  episodeNumber: number;
  title: string;
  airDate: string;
  id: string;
}

export interface ShowFormData {
  name: string;
  source: string;
  overview: string;
  network: string;
  genres: string;
  watch_url: string;
  poster_url: string;
}

interface UseShowTVDBCreatorParams {
  seriesTitle: string;
  onShowCreated: (show: Show) => void;
}

/**
 * State and side effects for creating a new show: TVDB search, applying a
 * selected TVDB result to the form, manual-form fallback, and the create-show
 * API call.
 */
export function useShowTVDBCreator({
  seriesTitle,
  onShowCreated,
}: UseShowTVDBCreatorParams) {
  const [searchQuery, setSearchQuery] = useState(seriesTitle);
  const [searchResults, setSearchResults] = useState<TVDBSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [showData, setShowData] = useState<ShowFormData>({
    name: seriesTitle,
    source: "rtp",
    overview: "",
    network: "",
    genres: "",
    watch_url: "",
    poster_url: "",
  });

  const [selectedTVDBShow, setSelectedTVDBShow] =
    useState<TVDBSearchResult | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  const updateShowData = (patch: Partial<ShowFormData>) =>
    setShowData((prev) => ({ ...prev, ...patch }));

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError("");
    try {
      const results = await TVDBService.searchShows(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setShowManualForm(true);
      }
    } catch (err) {
      setError("Failed to search TVDB");
      console.error("Search error:", err);
      setShowManualForm(true);
    } finally {
      setSearching(false);
    }
  };

  const selectTVDBShow = async (tvdbShow: TVDBSearchResult) => {
    setSelectedTVDBShow(tvdbShow);

    try {
      // Update with search result data
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
        setShowData({
          name: fullShow.name,
          source: "rtp",
          overview: fullShow.overview || "",
          network: fullShow.network || "",
          genres: fullShow.genres?.join(", ") || "",
          watch_url: "", // Keep empty for user to fill
          poster_url: fullShow.image || tvdbShow.image_url || "",
        });
      }
    } catch (err) {
      console.error("Error fetching TVDB details:", err);
      setError("Failed to fetch show details from TVDB");
    }
  };

  const handleCreateShow = async () => {
    if (!showData.name.trim()) {
      setError("Show name is required");
      return;
    }

    setCreating(true);
    setError("");

    try {
      // Create show data object
      const createData: {
        name: string;
        source: string;
        overview: string | null;
        network: string | null;
        genres: string[];
        watch_url: string | null;
        poster_url: string | null;
        tvdb_id?: number;
        tvdb_slug?: string;
      } = {
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

      // Add TVDB fields if we have a selected show
      if (
        selectedTVDBShow &&
        selectedTVDBShow.objectID &&
        selectedTVDBShow.slug
      ) {
        createData.tvdb_id = parseInt(selectedTVDBShow.objectID);
        createData.tvdb_slug = selectedTVDBShow.slug;
      }

      // Call API to create show
      const response = await fetch("/api/shows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create show");
      }

      const createdShow = await response.json();
      onShowCreated(createdShow);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to create show: ${errorMessage}`);
    } finally {
      setCreating(false);
    }
  };

  const resetToSearch = () => {
    setShowManualForm(false);
    setSelectedTVDBShow(null);
    setShowData({
      name: seriesTitle,
      source: "rtp",
      overview: "",
      network: "",
      genres: "",
      watch_url: "",
      poster_url: "",
    });
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    creating,
    error,
    showData,
    updateShowData,
    selectedTVDBShow,
    showManualForm,
    setShowManualForm,
    handleSearch,
    selectTVDBShow,
    handleCreateShow,
    resetToSearch,
  };
}
