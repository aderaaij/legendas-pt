import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  PhraseExtractionService,
  Show,
  Episode,
  ExtractedPhrase,
  supabase,
} from "@/lib/supabase";
import {
  parseShowSlug,
  normalizeShowName,
  generateShowSlug,
} from "@/utils/slugify";

export type ViewMode = "edit" | "phrase-edit";

export interface EditingSession {
  extractionId: string;
  showName: string;
  episodeTitle?: string;
}

export interface EpisodeExtraction {
  id: string;
  source: string;
  total_phrases_found: number;
  created_at: string;
  was_truncated: boolean;
  current_phrase_count: number;
}

/**
 * Loads and manages an episode's edit page: resolves the show/episode from the
 * route slugs, loads phrases and extractions (with live phrase counts), and
 * provides the extraction/episode delete + phrase-edit navigation actions.
 */
export function useEpisodeEdit() {
  const params = useParams();
  const router = useRouter();
  const series = params.series as string;
  const episode = params.episode as string;

  const [show, setShow] = useState<Show | null>(null);
  const [episodeData, setEpisodeData] = useState<Episode | null>(null);
  const [phrases, setPhrases] = useState<ExtractedPhrase[]>([]);
  const [extractions, setExtractions] = useState<EpisodeExtraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [editingSession, setEditingSession] = useState<EditingSession | null>(
    null
  );

  const loadEpisodeData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Parse the series slug to get show information
      const parsedSeriesSlug = parseShowSlug(series);

      // Parse the episode slug (e.g., "s01e01")
      const episodeMatch = episode.match(/^s(\d+)e(\d+)$/i);
      if (!episodeMatch) {
        setError("Invalid episode format");
        return;
      }

      const season = parseInt(episodeMatch[1]);
      const episodeNumber = parseInt(episodeMatch[2]);

      // Find the actual show in the database
      const shows = await PhraseExtractionService.getAllShows();
      const normalizedSlugName = normalizeShowName(parsedSeriesSlug.showName);

      const matchingShow = shows.find(
        (s) =>
          normalizeShowName(s.name) === normalizedSlugName ||
          normalizeShowName(s.name).includes(normalizedSlugName) ||
          normalizedSlugName.includes(normalizeShowName(s.name))
      );

      if (!matchingShow) {
        setError("Show not found");
        return;
      }

      setShow(matchingShow);

      // Find the specific episode
      const allEpisodes = await PhraseExtractionService.getEpisodesForShow(
        matchingShow.id
      );
      const targetEpisode = allEpisodes.find(
        (ep) => ep.season === season && ep.episode_number === episodeNumber
      );

      if (!targetEpisode) {
        setError(
          `Episode S${season.toString().padStart(2, "0")}E${episodeNumber
            .toString()
            .padStart(2, "0")} not found`
        );
        return;
      }

      setEpisodeData(targetEpisode);

      // Load phrases for this episode
      const episodePhrases = await PhraseExtractionService.getPhrasesForEpisode(
        targetEpisode.id
      );
      setPhrases(episodePhrases);

      // Load extractions for this episode with current phrase counts
      const { data: episodeExtractions, error: extractionsError } =
        await supabase
          .from("phrase_extractions")
          .select(
            `
          id,
          source,
          total_phrases_found,
          created_at,
          was_truncated,
          show:shows(name),
          episode:episodes(season, episode_number, title)
        `
          )
          .eq("episode_id", targetEpisode.id)
          .order("created_at", { ascending: false });

      if (extractionsError) {
        console.error("Error loading extractions:", extractionsError);
        setExtractions([]);
      } else {
        // Enhance extractions with current phrase counts
        const extractionsWithCounts = await Promise.all(
          (episodeExtractions || []).map(async (extraction) => {
            const { data: currentPhrases } = await supabase
              .from("extracted_phrases")
              .select("id")
              .eq("extraction_id", extraction.id);

            return {
              ...extraction,
              current_phrase_count: currentPhrases?.length || 0,
            };
          })
        );
        setExtractions(extractionsWithCounts as unknown as EpisodeExtraction[]);
      }
    } catch (err) {
      setError(
        `Failed to load episode data: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error loading episode data:", err);
    } finally {
      setLoading(false);
    }
  }, [series, episode]);

  useEffect(() => {
    (async () => {
      await loadEpisodeData();
    })();
  }, [loadEpisodeData]);

  const handleEditExtraction = (
    extractionId: string,
    showName: string,
    episodeTitle?: string
  ) => {
    setEditingSession({ extractionId, showName, episodeTitle });
    setViewMode("phrase-edit");
  };

  const handleBackFromPhraseEdit = () => {
    setEditingSession(null);
    setViewMode("edit");
  };

  const deleteExtraction = async (extractionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this extraction? This will delete all associated phrases and cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeleting(extractionId);
      await PhraseExtractionService.deleteExtraction(extractionId);

      // Reload data
      await loadEpisodeData();
    } catch (err) {
      setError(
        `Failed to delete extraction: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error deleting extraction:", err);
    } finally {
      setDeleting(null);
    }
  };

  const deleteEpisode = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this episode? This will delete ALL extractions and phrases for this episode and cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeleting(episodeData!.id);

      // Delete all extractions for this episode
      for (const extraction of extractions) {
        await PhraseExtractionService.deleteExtraction(extraction.id);
      }

      // Navigate back to show
      router.push(`/${generateShowSlug(show!.name)}`);
    } catch (err) {
      setError(
        `Failed to delete episode: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error deleting episode:", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleMetadataUpdate = (
    updatedShow?: Show,
    updatedEpisode?: Episode
  ) => {
    if (updatedShow) {
      setShow(updatedShow);
    }
    if (updatedEpisode) {
      setEpisodeData(updatedEpisode);
    }
    setShowMetadataEditor(false);
    // Reload data to get fresh stats
    loadEpisodeData();
  };

  return {
    show,
    episodeData,
    phrases,
    extractions,
    loading,
    error,
    deleting,
    showMetadataEditor,
    setShowMetadataEditor,
    viewMode,
    editingSession,
    handleEditExtraction,
    handleBackFromPhraseEdit,
    deleteExtraction,
    deleteEpisode,
    handleMetadataUpdate,
  };
}
