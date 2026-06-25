"use client";

import { X, AlertCircle, Check } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

import ModalBase from "@/app/components/ui/ModalBase";

import BulkActionsBar from "./BulkActionsBar";
import DuplicateGroupCard from "./DuplicateGroupCard";
import { useDuplicateManager, type DuplicateGroup } from "./useDuplicateManager";

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
  const {
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
  } = useDuplicateManager({ duplicateGroups, onMergeComplete });

  if (duplicateGroups.length === 0) {
    return (
      <ModalBase
        isOpen={isOpen}
        onClose={onClose}
        contentClassName="rounded-xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <Dialog.Title
            className="text-xl font-bold"
            style={{ color: "var(--text)" }}
          >
            No Duplicates Found
          </Dialog.Title>
          <Dialog.Close
            className="p-2 transition-colors"
            style={{ color: "var(--faint)" }}
          >
            <X className="w-5 h-5" />
          </Dialog.Close>
        </div>
        <div className="text-center py-8">
          <Check
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: "var(--green)" }}
          />
          <p style={{ color: "var(--muted)" }}>
            Great! No duplicate phrases were found in this extraction.
          </p>
        </div>
      </ModalBase>
    );
  }

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden m-4"
    >
      <div className="p-6" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <Dialog.Title
              className="text-2xl font-bold"
              style={{ color: "var(--text)" }}
            >
              Manage Duplicate Phrases
            </Dialog.Title>
            <p className="mt-1" style={{ color: "var(--muted)" }}>
              Found {duplicateGroups.length} groups with {totalDuplicates}{" "}
              duplicate phrases
            </p>
          </div>
          <Dialog.Close
            className="p-2 transition-colors"
            style={{ color: "var(--faint)" }}
          >
            <X className="w-5 h-5" />
          </Dialog.Close>
        </div>

        <BulkActionsBar
          selectedCount={selectedGroups.size}
          totalGroups={duplicateGroups.length}
          bulkMerging={bulkMerging}
          onSelectAll={selectAllGroups}
          onDeselectAll={deselectAllGroups}
          onAutoSelect={autoSelectBestOptions}
          onBulkMerge={handleBulkMerge}
        />

        {error && (
          <div
            className="mt-4 rounded-lg p-3"
            style={{
              background: "rgba(229,9,20,.12)",
              border: "1px solid rgba(229,9,20,.25)",
            }}
          >
            <div className="flex items-center space-x-2">
              <AlertCircle
                className="w-4 h-4"
                style={{ color: "var(--accent2)" }}
              />
              <p className="text-sm" style={{ color: "var(--accent2)" }}>
                {error}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
        <div className="space-y-6">
          {duplicateGroups.map((group) => (
            <DuplicateGroupCard
              key={group.normalizedPhrase}
              group={group}
              isExpanded={expandedGroup === group.normalizedPhrase}
              isMerging={merging === group.normalizedPhrase}
              isGroupSelected={selectedGroups.has(group.normalizedPhrase)}
              selected={selectedPhrases[group.normalizedPhrase]}
              onToggleSelect={() => toggleGroupSelection(group.normalizedPhrase)}
              onToggleExpand={() =>
                setExpandedGroup(
                  expandedGroup === group.normalizedPhrase
                    ? null
                    : group.normalizedPhrase
                )
              }
              onMerge={() => handleMergeGroup(group)}
              onSelectPhraseTranslation={selectPhraseAndTranslation}
            />
          ))}
        </div>
      </div>

      <div
        className="p-6"
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--surface2)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Merging duplicates will permanently delete the unselected
              variations.
            </p>
            {selectedGroups.size > 0 && (
              <p
                className="text-sm font-medium mt-1"
                style={{ color: "var(--blue)" }}
              >
                {selectedGroups.size} groups selected for bulk merge
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md transition-colors"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border2)",
              color: "var(--text)",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
