import { useState, useEffect, useCallback } from "react";

import {
  PhraseExtractionService,
  ExtractedPhrase,
  Show,
  Episode,
} from "@/lib/supabase";

export interface EditablePhrase extends ExtractedPhrase {
  isEditing: boolean;
  hasChanges: boolean;
  isDuplicate?: boolean;
  duplicateCount?: number;
}

interface UsePhraseEditorParams {
  extractionId: string;
  showName: string;
  episodeTitle?: string;
}

/**
 * Owns the phrase editor's data and mutations: loading phrases + duplicate
 * analysis and extraction metadata, inline edit/save/delete, adding phrases,
 * and reacting to metadata/duplicate-merge updates.
 */
export function usePhraseEditor({
  extractionId,
  showName,
  episodeTitle,
}: UsePhraseEditorParams) {
  const [phrases, setPhrases] = useState<EditablePhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [newPhrase, setNewPhrase] = useState({
    phrase: "",
    translation: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Duplicate management state
  const [showDuplicateManager, setShowDuplicateManager] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<
    Array<{
      normalizedPhrase: string;
      phrases: ExtractedPhrase[];
    }>
  >([]);
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Metadata state
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [currentShow, setCurrentShow] = useState<Show | undefined>();
  const [currentEpisode, setCurrentEpisode] = useState<Episode | undefined>();
  const [displayShowName, setDisplayShowName] = useState(showName);
  const [displayEpisodeTitle, setDisplayEpisodeTitle] = useState(episodeTitle);

  const loadPhrases = useCallback(async () => {
    try {
      setLoading(true);

      const {
        phrases: phrasesWithDuplicates,
        duplicateGroups: foundDuplicates,
      } = await PhraseExtractionService.getPhrasesWithDuplicateAnalysis(
        extractionId
      );

      setPhrases(
        phrasesWithDuplicates.map((phrase) => ({
          ...phrase,
          isEditing: false,
          hasChanges: false,
        }))
      );

      setDuplicateGroups(foundDuplicates);
      setDuplicateCount(
        foundDuplicates.reduce(
          (sum, group) => sum + group.phrases.length - 1,
          0
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to load phrases: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [extractionId]);

  const loadMetadata = useCallback(async () => {
    try {
      const extractionData =
        await PhraseExtractionService.getExtractionWithMetadata(extractionId);
      setCurrentShow(extractionData.show);
      setCurrentEpisode(extractionData.episode);

      // Update display names if we have better data
      if (extractionData.show?.name) {
        setDisplayShowName(extractionData.show.name);
      }
      if (extractionData.episode?.title) {
        setDisplayEpisodeTitle(extractionData.episode.title);
      }
    } catch (err) {
      console.error("Failed to load metadata:", err);
    }
  }, [extractionId]);

  useEffect(() => {
    (async () => {
      await Promise.all([loadPhrases(), loadMetadata()]);
    })();
  }, [extractionId, loadPhrases, loadMetadata]);

  const startEditing = (phraseId: string) => {
    setPhrases((prev) =>
      prev.map((phrase) =>
        phrase.id === phraseId ? { ...phrase, isEditing: true } : phrase
      )
    );
  };

  const cancelEditing = (phraseId: string) => {
    setPhrases((prev) =>
      prev.map((phrase) =>
        phrase.id === phraseId
          ? { ...phrase, isEditing: false, hasChanges: false }
          : phrase
      )
    );
    // Reload to reset changes
    loadPhrases();
  };

  const updatePhraseField = (
    phraseId: string,
    field: keyof ExtractedPhrase,
    value: string
  ) => {
    setPhrases((prev) =>
      prev.map((phrase) =>
        phrase.id === phraseId
          ? { ...phrase, [field]: value, hasChanges: true }
          : phrase
      )
    );
  };

  const savePhrase = async (phraseId: string) => {
    const phrase = phrases.find((p) => p.id === phraseId);
    if (!phrase) return;

    try {
      setSaving(true);

      await PhraseExtractionService.updatePhrase(phraseId, {
        phrase: phrase.phrase,
        translation: phrase.translation,
      });

      setPhrases((prev) =>
        prev.map((p) =>
          p.id === phraseId ? { ...p, isEditing: false, hasChanges: false } : p
        )
      );
    } catch (err) {
      setError("Failed to save phrase");
      console.error("Error saving phrase:", err);
    } finally {
      setSaving(false);
    }
  };

  const deletePhrase = async (phraseId: string) => {
    if (!confirm("Are you sure you want to delete this phrase?")) return;

    try {
      setSaving(true);

      await PhraseExtractionService.deletePhrase(phraseId);

      setPhrases((prev) => prev.filter((p) => p.id !== phraseId));
    } catch (err) {
      setError("Failed to delete phrase");
      console.error("Error deleting phrase:", err);
    } finally {
      setSaving(false);
    }
  };

  const addNewPhrase = async () => {
    if (!newPhrase.phrase.trim() || !newPhrase.translation.trim()) {
      setError("Phrase and translation are required");
      return;
    }

    try {
      setSaving(true);

      await PhraseExtractionService.addPhrase(
        extractionId,
        newPhrase.phrase.trim(),
        newPhrase.translation.trim()
      );

      // Reset form
      setNewPhrase({ phrase: "", translation: "" });
      setShowAddForm(false);

      // Reload phrases
      await loadPhrases();
    } catch (err) {
      setError("Failed to add phrase");
      console.error("Error adding phrase:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateManageComplete = () => {
    setShowDuplicateManager(false);
    // Reload phrases to get updated duplicate analysis
    loadPhrases();
  };

  const handleMetadataUpdate = (
    updatedShow?: Show,
    updatedEpisode?: Episode
  ) => {
    setCurrentShow(updatedShow);
    setCurrentEpisode(updatedEpisode);

    if (updatedShow?.name) {
      setDisplayShowName(updatedShow.name);
    }
    if (updatedEpisode?.title) {
      setDisplayEpisodeTitle(updatedEpisode.title);
    }
  };

  return {
    phrases,
    loading,
    saving,
    error,
    setError,
    newPhrase,
    setNewPhrase,
    showAddForm,
    setShowAddForm,
    showDuplicateManager,
    setShowDuplicateManager,
    duplicateGroups,
    duplicateCount,
    showMetadataEditor,
    setShowMetadataEditor,
    currentShow,
    currentEpisode,
    displayShowName,
    displayEpisodeTitle,
    startEditing,
    cancelEditing,
    updatePhraseField,
    savePhrase,
    deletePhrase,
    addNewPhrase,
    handleDuplicateManageComplete,
    handleMetadataUpdate,
  };
}
