"use client";

import { useState } from "react";
import {
  X,
  Copy,
  Merge,
  AlertCircle,
  Check,
  Zap,
  CheckSquare,
  Square,
} from "lucide-react";
import { PhraseExtractionService, ExtractedPhrase } from "@/lib/supabase";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";

interface DuplicateGroup {
  normalizedPhrase: string;
  phrases: ExtractedPhrase[];
}

interface DuplicatePhraseManagerProps {
  extractionId: string;
  duplicateGroups: DuplicateGroup[];
  onClose: () => void;
  onMergeComplete: () => void;
  isOpen: boolean;
}

export default function DuplicatePhraseManager({
  extractionId: _extractionId,
  duplicateGroups,
  onClose,
  onMergeComplete,
  isOpen,
}: DuplicatePhraseManagerProps) {
  const [merging, setMerging] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedPhrases, setSelectedPhrases] = useState<
    Record<
      string,
      {
        phrase: string;
        translation: string;
      }
    >
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
    const autoSelections: Record<
      string,
      { phrase: string; translation: string }
    > = {};

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

  if (duplicateGroups.length === 0) {
    return (
      <AnimatePresence>
        {isOpen && (
          <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
              <Dialog.Overlay asChild>
                <motion.div
                  className="fixed inset-0 z-50"
                  style={{ background: "rgba(4,4,6,.72)", backdropFilter: "blur(4px)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  className="fixed top-1/2 left-1/2 rounded-xl max-w-md w-full p-6 z-50"
                  style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}
                  initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
                  animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                  exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-xl font-bold" style={{ color: "var(--text)" }}>
                      No Duplicates Found
                    </Dialog.Title>
                    <Dialog.Close className="p-2 transition-colors" style={{ color: "var(--faint)" }}>
                      <X className="w-5 h-5" />
                    </Dialog.Close>
                  </div>
                  <div className="text-center py-8">
                    <Check className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--green)" }} />
                    <p style={{ color: "var(--muted)" }}>
                      Great! No duplicate phrases were found in this extraction.
                    </p>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
          <Dialog.Portal>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50"
                style={{ background: "rgba(4,4,6,.72)", backdropFilter: "blur(4px)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed top-1/2 left-1/2 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden z-50 m-4"
                style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}
                initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-6" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Dialog.Title className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                        Manage Duplicate Phrases
                      </Dialog.Title>
                      <p className="mt-1" style={{ color: "var(--muted)" }}>
                        Found {duplicateGroups.length} groups with{" "}
                        {totalDuplicates} duplicate phrases
                      </p>
                    </div>
                    <Dialog.Close className="p-2 transition-colors" style={{ color: "var(--faint)" }}>
                      <X className="w-5 h-5" />
                    </Dialog.Close>
                  </div>

                  {/* Bulk Actions */}
                  <div className="rounded-lg p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold" style={{ color: "var(--text)" }}>
                        Bulk Actions
                      </h3>
                      <div className="text-sm" style={{ color: "var(--muted)" }}>
                        {selectedGroups.size} of {duplicateGroups.length} groups
                        selected
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={
                          selectedGroups.size === duplicateGroups.length
                            ? deselectAllGroups
                            : selectAllGroups
                        }
                        className="flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors"
                        style={{ background: "var(--blue)", color: "#04122e" }}
                      >
                        {selectedGroups.size === duplicateGroups.length ? (
                          <>
                            <Square className="w-3 h-3" />
                            <span>Deselect All</span>
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-3 h-3" />
                            <span>Select All</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={autoSelectBestOptions}
                        className="flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)" }}
                      >
                        <Zap className="w-3 h-3" />
                        <span>Auto-Select Best</span>
                      </button>

                      {selectedGroups.size > 0 && (
                        <button
                          onClick={handleBulkMerge}
                          disabled={bulkMerging}
                          className="flex items-center space-x-1 px-3 py-1 rounded text-sm disabled:opacity-50 transition-colors"
                          style={{ background: "var(--green)", color: "#04210f" }}
                        >
                          <Merge className="w-3 h-3" />
                          <span>
                            {bulkMerging
                              ? `Merging ${selectedGroups.size} groups...`
                              : `Merge Selected (${selectedGroups.size})`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="mt-4 rounded-lg p-3" style={{ background: "rgba(229,9,20,.12)", border: "1px solid rgba(229,9,20,.25)" }}>
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4" style={{ color: "var(--accent2)" }} />
                        <p className="text-sm" style={{ color: "var(--accent2)" }}>{error}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
                  <div className="space-y-6">
                    {duplicateGroups.map((group) => {
                      const isExpanded =
                        expandedGroup === group.normalizedPhrase;
                      const selected = selectedPhrases[group.normalizedPhrase];
                      const isMerging = merging === group.normalizedPhrase;
                      const isGroupSelected = selectedGroups.has(
                        group.normalizedPhrase
                      );

                      return (
                        <div
                          key={group.normalizedPhrase}
                          className="rounded-lg"
                          style={{ border: "1px solid var(--border)" }}
                        >
                          <div
                            className="p-4"
                            style={{
                              background: isGroupSelected
                                ? "rgba(91,140,255,.12)"
                                : "var(--surface2)",
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() =>
                                    toggleGroupSelection(group.normalizedPhrase)
                                  }
                                  className="flex items-center justify-center w-5 h-5 rounded transition-colors"
                                  style={{
                                    background: isGroupSelected ? "var(--accent)" : "transparent",
                                    border: `2px solid ${isGroupSelected ? "var(--accent)" : "var(--border2)"}`,
                                    color: "#fff",
                                  }}
                                >
                                  {isGroupSelected && (
                                    <CheckSquare className="w-3 h-3" />
                                  )}
                                </button>
                                <div>
                                  <h3 className="font-semibold" style={{ color: "var(--text)" }}>
                                    Similar to: &quot;{group.normalizedPhrase}
                                    &quot;
                                  </h3>
                                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                                    {group.phrases.length} variations found
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {selected && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(61,220,132,.15)", color: "var(--green)" }}>
                                    Ready to merge
                                  </span>
                                )}
                                <button
                                  onClick={() =>
                                    setExpandedGroup(
                                      isExpanded ? null : group.normalizedPhrase
                                    )
                                  }
                                  className="text-sm font-medium"
                                  style={{ color: "var(--accent2)" }}
                                >
                                  {isExpanded ? "Collapse" : "Review & Merge"}
                                </button>
                                {selected && !isGroupSelected && (
                                  <button
                                    onClick={() => handleMergeGroup(group)}
                                    disabled={isMerging}
                                    className="flex items-center space-x-1 px-3 py-1 rounded text-sm disabled:opacity-50 transition-colors"
                                    style={{ background: "var(--green)", color: "#04210f" }}
                                  >
                                    <Merge className="w-3 h-3" />
                                    <span>
                                      {isMerging ? "Merging..." : "Merge"}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-4 space-y-3">
                              <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
                                Select the best phrase and translation to keep.
                                All other variations will be deleted.
                              </p>

                              {group.phrases.map((phrase) => {
                                const isSelectedPhrase =
                                  selected?.phrase === phrase.phrase;
                                const isSelectedTranslation =
                                  selected?.translation === phrase.translation;

                                return (
                                  <div
                                    key={phrase.id}
                                    className="rounded-lg p-3 transition-all"
                                    style={{
                                      background:
                                        isSelectedPhrase && isSelectedTranslation
                                          ? "rgba(61,220,132,.1)"
                                          : "var(--bg2)",
                                      border: `1px solid ${
                                        isSelectedPhrase && isSelectedTranslation
                                          ? "var(--green)"
                                          : "var(--border)"
                                      }`,
                                    }}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="font-medium mb-1" style={{ color: "var(--text)" }}>
                                          {phrase.phrase}
                                        </div>
                                        <div className="text-sm" style={{ color: "var(--muted)" }}>
                                          {phrase.translation}
                                        </div>
                                      </div>
                                      <div className="flex flex-col space-y-1 ml-4">
                                        <button
                                          onClick={() =>
                                            selectPhraseAndTranslation(
                                              group.normalizedPhrase,
                                              phrase.phrase,
                                              phrase.translation
                                            )
                                          }
                                          className="flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors"
                                          style={
                                            isSelectedPhrase && isSelectedTranslation
                                              ? { background: "var(--green)", color: "#04210f" }
                                              : { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)" }
                                          }
                                        >
                                          <Copy className="w-3 h-3" />
                                          <span>Keep This</span>
                                        </button>

                                        {(!selected || !isSelectedPhrase) && (
                                          <button
                                            onClick={() =>
                                              selectPhraseAndTranslation(
                                                group.normalizedPhrase,
                                                selected?.phrase ||
                                                  phrase.phrase,
                                                phrase.translation
                                              )
                                            }
                                            className="flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors"
                                            style={
                                              isSelectedTranslation
                                                ? { background: "var(--blue)", color: "#04122e" }
                                                : { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--muted)" }
                                            }
                                          >
                                            <span>Keep Translation</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {selected && (
                                <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(91,140,255,.1)", border: "1px solid rgba(91,140,255,.25)" }}>
                                  <h4 className="font-medium mb-2" style={{ color: "var(--blue)" }}>
                                    Final Result:
                                  </h4>
                                  <div className="font-medium" style={{ color: "var(--text)" }}>
                                    {selected.phrase}
                                  </div>
                                  <div className="text-sm" style={{ color: "var(--muted)" }}>
                                    {selected.translation}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6" style={{ borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{ color: "var(--muted)" }}>
                        Merging duplicates will permanently delete the
                        unselected variations.
                      </p>
                      {selectedGroups.size > 0 && (
                        <p className="text-sm font-medium mt-1" style={{ color: "var(--blue)" }}>
                          {selectedGroups.size} groups selected for bulk merge
                        </p>
                      )}
                    </div>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-md transition-colors"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)" }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  );
}
