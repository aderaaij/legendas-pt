import { useState, useEffect, useCallback, useMemo } from "react";
import { Show, PhraseExtractionService } from "@/lib/supabase";
import TVDBService, { TVDBSearchResult } from "@/lib/tvdb";
import { useEpisodeSelection } from "@/hooks/useEpisodeSelection";

export function useShowSelector() {
  const [searchQuery, setSearchQueryState] = useState("");
  const [existingShows, setExistingShows] = useState<Show[]>([]);
  const [isSearchingTVDB, setIsSearchingTVDB] = useState(false);
  const [tvdbResults, setTvdbResults] = useState<TVDBSearchResult[]>([]);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [isCreatingShow, setIsCreatingShow] = useState(false);
  const [error, setError] = useState<string>("");
  const [showsWithExtractions, setShowsWithExtractions] = useState<Set<string>>(
    new Set()
  );
  const [isDeletingShow, setIsDeletingShow] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );

  const {
    episodes,
    isLoadingEpisodes,
    loadEpisodes,
    loadEpisodesForNewShow,
    refreshEpisodes: refreshShowEpisodes,
    clearEpisodes,
  } = useEpisodeSelection(setError);

  // Load existing shows on mount
  useEffect(() => {
    const loadShows = async () => {
      try {
        const shows = await PhraseExtractionService.getAllShows();
        setExistingShows(shows);

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

  // Derive the filtered list during render instead of syncing it via an effect.
  const filteredShows = useMemo(() => {
    if (searchQuery.trim() === "") return existingShows;
    return existingShows.filter((show) =>
      show.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, existingShows]);

  // Offer the "search TVDB" option only when a query matches no existing show.
  const showTVDBResults =
    searchQuery.trim() !== "" && filteredShows.length === 0;

  // Wrap the query setter so stale TVDB results are cleared whenever the query
  // changes (this was previously a side effect of the filter effect).
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    setTvdbResults([]);
  }, []);

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
  const handleSelectExistingShow = useCallback(
    async (show: Show) => {
      setSelectedShow(show);
      setError("");
      await loadEpisodes(show);
    },
    [loadEpisodes]
  );

  // Handle creating a new show from TVDB result
  const handleCreateShowFromTVDB = useCallback(
    async (tvdbShow: TVDBSearchResult) => {
      setIsCreatingShow(true);
      setError("");

      try {
        // Get full show details
        const showDetails = await TVDBService.getShowDetails(
          parseInt(tvdbShow.tvdb_id)
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
        setSearchQueryState("");
        setTvdbResults([]);

        // Immediately fetch and load episodes from TVDB for the new show
        await loadEpisodesForNewShow(newShow);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create show");
      } finally {
        setIsCreatingShow(false);
      }
    },
    [loadEpisodesForNewShow]
  );

  // Refresh episodes from TVDB for the selected show
  const refreshEpisodes = useCallback(
    () => refreshShowEpisodes(selectedShow),
    [refreshShowEpisodes, selectedShow]
  );

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
            clearEpisodes();
          }
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
    [selectedShow, clearEpisodes]
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
