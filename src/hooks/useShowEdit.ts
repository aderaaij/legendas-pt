import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import { PhraseExtractionService, Show, Episode, supabase } from "@/lib/supabase";
import { parseShowSlug, normalizeShowName } from "@/utils/slugify";

type ViewMode = "edit" | "phrase-edit";

interface EditingSession {
  extractionId: string;
  showName: string;
  episodeTitle?: string;
}

interface UseShowEditReturn {
  // State
  show: Show | null;
  episodes: (Episode & { extractionCount: number; totalPhrases: number; lastExtraction: string | null })[];
  extractions: (any & { current_phrase_count: number })[];
  loading: boolean;
  error: string;
  deleting: string | null;
  showMetadataEditor: boolean;
  viewMode: ViewMode;
  editingSession: EditingSession | null;
  
  // Actions
  setShowMetadataEditor: (show: boolean) => void;
  handleEditExtraction: (extractionId: string, showName: string, episodeTitle?: string) => void;
  handleBackFromPhraseEdit: () => void;
  deleteExtraction: (extractionId: string) => Promise<void>;
  deleteShow: () => Promise<void>;
  handleMetadataUpdate: (updatedShow?: Show, updatedEpisode?: Episode) => void;
  loadShowData: () => Promise<void>;
}

export function useShowEdit(series: string): UseShowEditReturn {
  const router = useRouter();
  
  const [show, setShow] = useState<Show | null>(null);
  const [episodes, setEpisodes] = useState<(Episode & { extractionCount: number; totalPhrases: number; lastExtraction: string | null })[]>([]);
  const [extractions, setExtractions] = useState<(any & { current_phrase_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [editingSession, setEditingSession] = useState<EditingSession | null>(null);

  const loadShowData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Parse the series slug to get show information
      const parsedSlug = parseShowSlug(series);

      // Find the actual show in the database
      const shows = await PhraseExtractionService.getAllShows();
      const normalizedSlugName = normalizeShowName(parsedSlug.showName);
      
      const matchingShow = shows.find(s => 
        normalizeShowName(s.name) === normalizedSlugName ||
        normalizeShowName(s.name).includes(normalizedSlugName) ||
        normalizedSlugName.includes(normalizeShowName(s.name))
      );

      if (!matchingShow) {
        setError("Show not found");
        return;
      }

      setShow(matchingShow);

      // Load episodes for this show
      const showEpisodes = await PhraseExtractionService.getEpisodesWithExtractionStats(matchingShow.id);
      setEpisodes(showEpisodes);

      // Load extractions for this show with current phrase counts
      const { data: showExtractions, error: extractionsError } = await supabase
        .from("phrase_extractions")
        .select(`
          id,
          source,
          total_phrases_found,
          created_at,
          was_truncated,
          show:shows(name),
          episode:episodes(season, episode_number, title)
        `)
        .eq("show_id", matchingShow.id)
        .order("created_at", { ascending: false });

      if (extractionsError) {
        console.error("Error loading extractions:", extractionsError);
        setExtractions([]);
      } else {
        // Enhance extractions with current phrase counts
        const extractionsWithCounts = await Promise.all(
          (showExtractions || []).map(async (extraction) => {
            const { data: currentPhrases } = await supabase
              .from("extracted_phrases")
              .select("id")
              .eq("extraction_id", extraction.id);
            
            return {
              ...extraction,
              current_phrase_count: currentPhrases?.length || 0
            };
          })
        );
        setExtractions(extractionsWithCounts);
      }
    } catch (err) {
      setError(
        `Failed to load show data: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error loading show data:", err);
    } finally {
      setLoading(false);
    }
  }, [series]);

  useEffect(() => {
    loadShowData();
  }, [loadShowData]);

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
      await loadShowData();
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

  const deleteShow = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this entire show? This will delete ALL extractions and phrases for this show and cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeleting(show!.id);

      // Use the PhraseExtractionService.deleteShow method which handles cascade deletion
      await PhraseExtractionService.deleteShow(show!.id);

      // Navigate back to home
      router.push("/");
    } catch (err) {
      setError(
        `Failed to delete show: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error deleting show:", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleMetadataUpdate = (updatedShow?: Show, _updatedEpisode?: Episode) => {
    if (updatedShow) {
      setShow(updatedShow);
    }
    setShowMetadataEditor(false);
    // Reload data to get fresh stats
    loadShowData();
  };

  return {
    // State
    show,
    episodes,
    extractions,
    loading,
    error,
    deleting,
    showMetadataEditor,
    viewMode,
    editingSession,
    
    // Actions
    setShowMetadataEditor,
    handleEditExtraction,
    handleBackFromPhraseEdit,
    deleteExtraction,
    deleteShow,
    handleMetadataUpdate,
    loadShowData,
  };
}