import { useState, useCallback } from "react";

import { Show, Episode, PhraseExtractionService } from "@/lib/supabase";

/**
 * Owns the episode list for a selected show: loading (with a DB fallback when
 * TVDB fails), loading for a freshly-created show, refreshing from TVDB, and
 * clearing. Error reporting is delegated to the caller via `setError`.
 */
export function useEpisodeSelection(setError: (message: string) => void) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

  const loadEpisodes = useCallback(
    async (show: Show) => {
      setIsLoadingEpisodes(true);

      try {
        if (show.tvdb_id) {
          // Always fetch fresh episode data from TVDB for shows with TVDB ID
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
    },
    [setError]
  );

  const loadEpisodesForNewShow = useCallback(async (show: Show) => {
    setIsLoadingEpisodes(true);

    try {
      const episodeList =
        await PhraseExtractionService.fetchAndSaveEpisodesFromTVDB(show);
      setEpisodes(episodeList);
    } catch (episodeError) {
      console.error("Failed to load episodes for new show:", episodeError);
      setEpisodes([]);
    } finally {
      setIsLoadingEpisodes(false);
    }
  }, []);

  const refreshEpisodes = useCallback(
    async (show: Show | null) => {
      if (!show || !show.tvdb_id) return;

      setIsLoadingEpisodes(true);
      setError("");

      try {
        const episodeList =
          await PhraseExtractionService.fetchAndSaveEpisodesFromTVDB(show);
        setEpisodes(episodeList);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to refresh episodes"
        );
      } finally {
        setIsLoadingEpisodes(false);
      }
    },
    [setError]
  );

  const clearEpisodes = useCallback(() => setEpisodes([]), []);

  return {
    episodes,
    isLoadingEpisodes,
    loadEpisodes,
    loadEpisodesForNewShow,
    refreshEpisodes,
    clearEpisodes,
  };
}
