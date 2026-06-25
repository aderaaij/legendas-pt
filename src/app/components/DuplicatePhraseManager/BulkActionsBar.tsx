"use client";

import { Merge, Zap, CheckSquare, Square } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  totalGroups: number;
  bulkMerging: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAutoSelect: () => void;
  onBulkMerge: () => void;
}

/** Bulk-action controls for the duplicate manager: select/deselect all,
 * auto-select best options, and merge the currently selected groups. */
export default function BulkActionsBar({
  selectedCount,
  totalGroups,
  bulkMerging,
  onSelectAll,
  onDeselectAll,
  onAutoSelect,
  onBulkMerge,
}: BulkActionsBarProps) {
  const allSelected = selectedCount === totalGroups;

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold" style={{ color: "var(--text)" }}>
          Bulk Actions
        </h3>
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          {selectedCount} of {totalGroups} groups selected
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors"
          style={{ background: "var(--blue)", color: "#04122e" }}
        >
          {allSelected ? (
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
          onClick={onAutoSelect}
          className="flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors"
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border2)",
            color: "var(--text)",
          }}
        >
          <Zap className="w-3 h-3" />
          <span>Auto-Select Best</span>
        </button>

        {selectedCount > 0 && (
          <button
            onClick={onBulkMerge}
            disabled={bulkMerging}
            className="flex items-center space-x-1 px-3 py-1 rounded text-sm disabled:opacity-50 transition-colors"
            style={{ background: "var(--green)", color: "#04210f" }}
          >
            <Merge className="w-3 h-3" />
            <span>
              {bulkMerging
                ? `Merging ${selectedCount} groups...`
                : `Merge Selected (${selectedCount})`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
