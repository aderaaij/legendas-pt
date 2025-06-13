import { useState, useEffect, useCallback } from "react";
import { Show, Episode, PhraseExtractionService } from "@/lib/supabase";
import TVDBService, { TVDBSearchResult } from "@/lib/tvdb";

export function useShowSelector() {
  const [searchQuery, setSearchQuery] = useState("");
  const [existingShows, setExistingShows] = useState<Show[]>([]);
  const [filteredShows, setFilteredShows] = useState<Show[]>([]);
  const [isSearchingTVDB, setIsSearchingTVDB] = useState(false);
  const [tvdbResults, setTvdbResults] = useState<TVDBSearchResult[]>([]);
  const [showTVDBResults, setShowTVDBResults] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [isCreatingShow, setIsCreatingShow] = useState(false);
  const [error, setError] = useState<string>("");
  const [showsWithExtractions, setShowsWithExtractions] = useState<Set<string>>(
    new Set()
  );
  const [isDeletingShow, setIsDeletingShow] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );

  // Load existing shows on mount
  useEffect(() => {
    const loadShows = async () => {
      try {
        const shows = await PhraseExtractionService.getAllShows();
        setExistingShows(shows);
        setFilteredShows(shows);

        // Check which shows have phrase extractions
        const extractionChecks = await Promise.all(
          shows.map(async (show) => {
            const hasExtractions =
              await PhraseExtractionService.showHasPhraseExtractions(show.id);
            return { showId: show.id, hasExtractions };
          })
        );

        const showsWithData = new Set(
          extractionChecks
            .filter((check) => check.hasExtractions)
            .map((check) => check.showId)
        );
        setShowsWithExtractions(showsWithData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shows");
      }
    };
    loadShows();
  }, []);

  // Filter existing shows based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredShows(existingShows);
      setShowTVDBResults(false);
      setTvdbResults([]);
    } else {
      const filtered = existingShows.filter((show) =>
        show.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredShows(filtered);

      // If no existing shows match, show the option to search TVDB
      if (filtered.length === 0) {
        setShowTVDBResults(true);
      } else {
        setShowTVDBResults(false);
        setTvdbResults([]);
      }
    }
  }, [searchQuery, existingShows]);

  // Search TVDB when user clicks "Add new show"
  const searchTVDB = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearchingTVDB(true);
    setError("");

    try {
      const results = await TVDBService.searchShows(searchQuery);
      setTvdbResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search TVDB");
      setTvdbResults([]);
    } finally {
      setIsSearchingTVDB(false);
    }
  }, [searchQuery]);

  // Handle selecting an existing show
  const handleSelectExistingShow = useCallback(async (show: Show) => {
    setSelectedShow(show);
    setIsLoadingEpisodes(true);
    setError("");

    try {
      if (show.tvdb_id) {
        // Always fetch fresh episode data from TVDB for shows with TVDB ID
        console.log(`Fetching all episodes for ${show.name} from TVDB...`);
        const episodeList =
          await PhraseExtractionService.fetchAndSaveEpisodesFromTVDB(show);
        setEpisodes(episodeList);
      } else {
        // Fallback to database episodes for shows without TVDB ID
        const episodeList = await PhraseExtractionService.getEpisodesForShow(
          show.id
        );
        setEpisodes(episodeList);
      }
    } catch (err) {
      // If TVDB fetch fails, try to get episodes from database as fallback
      try {
        console.log("TVDB fetch failed, falling back to database episodes...");
        const episodeList = await PhraseExtractionService.getEpisodesForShow(
          show.id
        );
        setEpisodes(episodeList);
        if (episodeList.length === 0) {
          setError("No episodes found for this show");
        }
      } catch {
        setError(
          err instanceof Error ? err.message : "Failed to load episodes"
        );
        setEpisodes([]);
      }
    } finally {
      setIsLoadingEpisodes(false);
    }
  }, []);

  // Handle creating a new show from TVDB result
  const handleCreateShowFromTVDB = useCallback(
    async (tvdbShow: TVDBSearchResult) => {
      setIsCreatingShow(true);
      setError("");

      try {
        // Get full show details
        const showDetails = await TVDBService.getShowDetails(
          parseInt(tvdbShow.objectID)
        );

        if (!showDetails) {
          throw new Error("Failed to get show details from TVDB");
        }

        // Create show in database
        const newShow = await PhraseExtractionService.createShowFromTVDB(
          showDetails
        );

        // Update local state
        setExistingShows((prev) => [...prev, newShow]);
        setSelectedShow(newShow);
        setSearchQuery("");
        setShowTVDBResults(false);
        setTvdbResults([]);

        // Immediately fetch and load episodes from TVDB for the new show
        setIsLoadingEpisodes(true);
        try {
          const episodeList =
            await PhraseExtractionService.fetchAndSaveEpisodesFromTVDB(newShow);
          setEpisodes(episodeList);
        } catch (episodeError) {
          console.error("Failed to load episodes for new show:", episodeError);
          setEpisodes([]);
        } finally {
          setIsLoadingEpisodes(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create show");
      } finally {
        setIsCreatingShow(false);
      }
    },
    []
  );

  // Refresh episodes from TVDB
  const refreshEpisodes = useCallback(async () => {
    if (!selectedShow || !selectedShow.tvdb_id) return;

    setIsLoadingEpisodes(true);
    setError("");

    try {
      const episodeList =
        await PhraseExtractionService.fetchAndSaveEpisodesFromTVDB(
          selectedShow
        );
      setEpisodes(episodeList);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh episodes"
      );
    } finally {
      setIsLoadingEpisodes(false);
    }
  }, [selectedShow]);

  // Handle show deletion
  const handleDeleteShow = useCallback(
    async (show: Show) => {
      setIsDeletingShow(show.id);
      setError("");

      try {
        const result = await PhraseExtractionService.safeDeleteShow(show.id);

        if (result.success) {
          // Remove from local state
          setExistingShows((prev) => prev.filter((s) => s.id !== show.id));
          setShowsWithExtractions((prev) => {
            const newSet = new Set(prev);
            newSet.delete(show.id);
            return newSet;
          });

          // Clear selection if this show was selected
          if (selectedShow?.id === show.id) {
            setSelectedShow(null);
            setEpisodes([]);
          }

          console.log(result.message);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete show");
      } finally {
        setIsDeletingShow(null);
        setShowDeleteConfirm(null);
      }
    },
    [selectedShow]
  );

  const clearError = useCallback(() => setError(""), []);

  return {
    // State
    searchQuery,
    existingShows,
    filteredShows,
    isSearchingTVDB,
    tvdbResults,
    showTVDBResults,
    selectedShow,
    episodes,
    isLoadingEpisodes,
    isCreatingShow,
    error,
    showsWithExtractions,
    isDeletingShow,
    showDeleteConfirm,

    // Actions
    setSearchQuery,
    setShowDeleteConfirm,
    searchTVDB,
    handleSelectExistingShow,
    handleCreateShowFromTVDB,
    refreshEpisodes,
    handleDeleteShow,
    clearError,
  };
}
