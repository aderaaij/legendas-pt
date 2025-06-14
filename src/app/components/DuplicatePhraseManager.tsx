"use client";

import { useState } from "react";
import { X, Copy, Merge, AlertCircle, Check, Zap, CheckSquare, Square } from "lucide-react";
import { PhraseExtractionService, ExtractedPhrase } from "@/lib/supabase";

interface DuplicateGroup {
  normalizedPhrase: string;
  phrases: ExtractedPhrase[];
}

interface DuplicatePhraseManagerProps {
  extractionId: string;
  duplicateGroups: DuplicateGroup[];
  onClose: () => void;
  onMergeComplete: () => void;
}

export default function DuplicatePhraseManager({
  extractionId: _extractionId,
  duplicateGroups,
  onClose,
  onMergeComplete,
}: DuplicatePhraseManagerProps) {
  const [merging, setMerging] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedPhrases, setSelectedPhrases] = useState<Record<string, {
    phrase: string;
    translation: string;
  }>>({});
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
      setSelectedPhrases(prev => {
        const newState = { ...prev };
        delete newState[group.normalizedPhrase];
        return newState;
      });

      onMergeComplete();
    } catch (err) {
      setError(`Failed to merge phrases: ${err instanceof Error ? err.message : "Unknown error"}`);
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
    setSelectedPhrases(prev => ({
      ...prev,
      [groupKey]: { phrase, translation }
    }));
  };

  const toggleGroupSelection = (groupKey: string) => {
    setSelectedGroups(prev => {
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
    setSelectedGroups(new Set(duplicateGroups.map(group => group.normalizedPhrase)));
  };

  const deselectAllGroups = () => {
    setSelectedGroups(new Set());
  };

  const autoSelectBestOptions = () => {
    const autoSelections: Record<string, { phrase: string; translation: string }> = {};
    
    duplicateGroups.forEach(group => {
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
        translation: bestTranslation.translation
      };
    });
    
    setSelectedPhrases(autoSelections);
  };

  const handleBulkMerge = async () => {
    if (selectedGroups.size === 0) {
      setError("Please select groups to merge");
      return;
    }

    const groupsToMerge = duplicateGroups.filter(group => 
      selectedGroups.has(group.normalizedPhrase)
    );

    const unselectedGroups = groupsToMerge.filter(group => 
      !selectedPhrases[group.normalizedPhrase]
    );

    if (unselectedGroups.length > 0) {
      setError(`Please configure merge options for ${unselectedGroups.length} selected groups`);
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
      setError(`Failed to merge phrases: ${err instanceof Error ? err.message : "Unknown error"}`);
      console.error("Error bulk merging phrases:", err);
    } finally {
      setBulkMerging(false);
    }
  };

  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.phrases.length - 1, 0);

  if (duplicateGroups.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">No Duplicates Found</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="text-center py-8">
            <Check className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <p className="text-gray-600">
              Great! No duplicate phrases were found in this extraction.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Manage Duplicate Phrases</h2>
              <p className="text-gray-600 mt-1">
                Found {duplicateGroups.length} groups with {totalDuplicates} duplicate phrases
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Bulk Actions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-900">Bulk Actions</h3>
              <div className="text-sm text-blue-700">
                {selectedGroups.size} of {duplicateGroups.length} groups selected
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={selectedGroups.size === duplicateGroups.length ? deselectAllGroups : selectAllGroups}
                className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
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
                className="flex items-center space-x-1 bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors"
              >
                <Zap className="w-3 h-3" />
                <span>Auto-Select Best</span>
              </button>
              
              {selectedGroups.size > 0 && (
                <button
                  onClick={handleBulkMerge}
                  disabled={bulkMerging}
                  className="flex items-center space-x-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Merge className="w-3 h-3" />
                  <span>
                    {bulkMerging 
                      ? `Merging ${selectedGroups.size} groups...` 
                      : `Merge Selected (${selectedGroups.size})`
                    }
                  </span>
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          <div className="space-y-6">
            {duplicateGroups.map((group) => {
              const isExpanded = expandedGroup === group.normalizedPhrase;
              const selected = selectedPhrases[group.normalizedPhrase];
              const isMerging = merging === group.normalizedPhrase;
              const isGroupSelected = selectedGroups.has(group.normalizedPhrase);

              return (
                <div
                  key={group.normalizedPhrase}
                  className="border border-gray-200 rounded-lg"
                >
                  <div className={`p-4 ${isGroupSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleGroupSelection(group.normalizedPhrase)}
                          className={`flex items-center justify-center w-5 h-5 border-2 rounded transition-colors ${
                            isGroupSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {isGroupSelected && <CheckSquare className="w-3 h-3" />}
                        </button>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Similar to: &quot;{group.normalizedPhrase}&quot;
                          </h3>
                          <p className="text-sm text-gray-600">
                            {group.phrases.length} variations found
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {selected && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            Ready to merge
                          </span>
                        )}
                        <button
                          onClick={() => setExpandedGroup(isExpanded ? null : group.normalizedPhrase)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {isExpanded ? "Collapse" : "Review & Merge"}
                        </button>
                        {selected && !isGroupSelected && (
                          <button
                            onClick={() => handleMergeGroup(group)}
                            disabled={isMerging}
                            className="flex items-center space-x-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            <Merge className="w-3 h-3" />
                            <span>{isMerging ? "Merging..." : "Merge"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 space-y-3">
                      <p className="text-sm text-gray-600 mb-3">
                        Select the best phrase and translation to keep. All other variations will be deleted.
                      </p>
                      
                      {group.phrases.map((phrase) => {
                        const isSelectedPhrase = selected?.phrase === phrase.phrase;
                        const isSelectedTranslation = selected?.translation === phrase.translation;
                        
                        return (
                          <div
                            key={phrase.id}
                            className={`border rounded-lg p-3 transition-all ${
                              isSelectedPhrase && isSelectedTranslation
                                ? "border-green-500 bg-green-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 mb-1">
                                  {phrase.phrase}
                                </div>
                                <div className="text-gray-600 text-sm">
                                  {phrase.translation}
                                </div>
                              </div>
                              <div className="flex flex-col space-y-1 ml-4">
                                <button
                                  onClick={() => selectPhraseAndTranslation(
                                    group.normalizedPhrase,
                                    phrase.phrase,
                                    phrase.translation
                                  )}
                                  className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                                    isSelectedPhrase && isSelectedTranslation
                                      ? "bg-green-600 text-white"
                                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  }`}
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Keep This</span>
                                </button>
                                
                                {(!selected || !isSelectedPhrase) && (
                                  <button
                                    onClick={() => selectPhraseAndTranslation(
                                      group.normalizedPhrase,
                                      selected?.phrase || phrase.phrase,
                                      phrase.translation
                                    )}
                                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                                      isSelectedTranslation
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
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
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Final Result:</h4>
                          <div className="font-medium text-gray-900">{selected.phrase}</div>
                          <div className="text-gray-600 text-sm">{selected.translation}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Merging duplicates will permanently delete the unselected variations.
              </p>
              {selectedGroups.size > 0 && (
                <p className="text-sm text-blue-600 font-medium mt-1">
                  {selectedGroups.size} groups selected for bulk merge
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}