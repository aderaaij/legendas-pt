"use client";

interface PhraseStatsBarProps {
  total: number;
  duplicateCount: number;
  unsavedChanges: number;
}

/** Summary row beneath the editor header: totals, duplicate and unsaved counts. */
export default function PhraseStatsBar({
  total,
  duplicateCount,
  unsavedChanges,
}: PhraseStatsBarProps) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    >
      <div
        className="flex items-center justify-between text-sm"
        style={{ color: "var(--muted)" }}
      >
        <span>{total} phrases total</span>
        <div className="flex items-center space-x-4">
          {duplicateCount > 0 && (
            <span className="font-medium" style={{ color: "var(--amber)" }}>
              {duplicateCount} duplicates found
            </span>
          )}
          <span>{unsavedChanges} unsaved changes</span>
        </div>
      </div>
    </div>
  );
}
