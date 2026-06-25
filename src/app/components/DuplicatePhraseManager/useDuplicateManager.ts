import { useState } from "react";

import { PhraseExtractionService, ExtractedPhrase } from "@/lib/supabase";

export interface DuplicateGroup {
  normalizedPhrase: string;
  phrases: ExtractedPhrase[];
}

interface SelectedPhrase {
  phrase: string;
  translation: string;
}

interface UseDuplicateManagerParams {
  duplicateGroups: DuplicateGroup[];
  onMergeComplete: () => void;
}

/**
 * Encapsulates all selection/merge state and actions for the duplicate phrase
 * manager: per-group phrase/translation choices, single and bulk merges, and
 * the auto-select heuristic.
 */
export function useDuplicateManager({
  duplicateGroups,
  onMergeComplete,
}: UseDuplicateManagerParams) {
  const [merging, setMerging] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedPhrases, setSelectedPhrases] = useState<
    Record<string, SelectedPhrase>
  >({});
  const [error, setError] = useState<string>("");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [bulkMerging, setBulkMerging] = useState(false);

  const handleMergeGroup = async (group: DuplicateGroup) => {
    const selected = selectedPhrases[group.normalizedPhrase];
    if (!selected) {
      setError("Please select a phrase and translation to keep");
      return;
    }

    try {
      setMerging(group.normalizedPhrase);
      setError("");

      await PhraseExtractionService.mergePhrases(
        group.phrases,
        selected.phrase,
        selected.translation
      );

      // Remove the merged group from our local state
      setSelectedPhrases((prev) => {
        const newState = { ...prev };
        delete newState[group.normalizedPhrase];
        return newState;
      });

      onMergeComplete();
    } catch (err) {
      setError(
        `Failed to merge phrases: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error merging phrases:", err);
    } finally {
      setMerging(null);
    }
  };

  const selectPhraseAndTranslation = (
    groupKey: string,
    phrase: string,
    translation: string
  ) => {
    setSelectedPhrases((prev) => ({
      ...prev,
      [groupKey]: { phrase, translation },
    }));
  };

  const toggleGroupSelection = (groupKey: string) => {
    setSelectedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const selectAllGroups = () => {
    setSelectedGroups(
      new Set(duplicateGroups.map((group) => group.normalizedPhrase))
    );
  };

  const deselectAllGroups = () => {
    setSelectedGroups(new Set());
  };

  const autoSelectBestOptions = () => {
    const autoSelections: Record<string, SelectedPhrase> = {};

    duplicateGroups.forEach((group) => {
      // Auto-select the "best" phrase and translation based on heuristics
      const phrases = group.phrases;

      // For phrase: prefer longer, more complete versions (likely has punctuation/capitalization)
      const bestPhrase = phrases.reduce((best, current) =>
        current.phrase.length > best.phrase.length ? current : best
      );

      // For translation: prefer the first one or longest one (could be more descriptive)
      const bestTranslation = phrases.reduce((best, current) =>
        current.translation.length > best.translation.length ? current : best
      );

      autoSelections[group.normalizedPhrase] = {
        phrase: bestPhrase.phrase,
        translation: bestTranslation.translation,
      };
    });

    setSelectedPhrases(autoSelections);
  };

  const handleBulkMerge = async () => {
    if (selectedGroups.size === 0) {
      setError("Please select groups to merge");
      return;
    }

    const groupsToMerge = duplicateGroups.filter((group) =>
      selectedGroups.has(group.normalizedPhrase)
    );

    const unselectedGroups = groupsToMerge.filter(
      (group) => !selectedPhrases[group.normalizedPhrase]
    );

    if (unselectedGroups.length > 0) {
      setError(
        `Please configure merge options for ${unselectedGroups.length} selected groups`
      );
      return;
    }

    try {
      setBulkMerging(true);
      setError("");

      // Process merges sequentially to avoid database conflicts
      for (const group of groupsToMerge) {
        const selected = selectedPhrases[group.normalizedPhrase];
        await PhraseExtractionService.mergePhrases(
          group.phrases,
          selected.phrase,
          selected.translation
        );
      }

      // Clear selections
      setSelectedGroups(new Set());
      setSelectedPhrases({});

      onMergeComplete();
    } catch (err) {
      setError(
        `Failed to merge phrases: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error bulk merging phrases:", err);
    } finally {
      setBulkMerging(false);
    }
  };

  const totalDuplicates = duplicateGroups.reduce(
    (sum, group) => sum + group.phrases.length - 1,
    0
  );

  return {
    merging,
    expandedGroup,
    setExpandedGroup,
    selectedPhrases,
    error,
    selectedGroups,
    bulkMerging,
    totalDuplicates,
    handleMergeGroup,
    selectPhraseAndTranslation,
    toggleGroupSelection,
    selectAllGroups,
    deselectAllGroups,
    autoSelectBestOptions,
    handleBulkMerge,
  };
}
