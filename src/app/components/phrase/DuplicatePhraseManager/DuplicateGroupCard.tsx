"use client";

import { Merge, CheckSquare } from "lucide-react";

import PhraseVariantRow from "./PhraseVariantRow";
import type { DuplicateGroup } from "./useDuplicateManager";

interface SelectedPhrase {
  phrase: string;
  translation: string;
}

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  isExpanded: boolean;
  isMerging: boolean;
  isGroupSelected: boolean;
  selected: SelectedPhrase | undefined;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onMerge: () => void;
  onSelectPhraseTranslation: (
    groupKey: string,
    phrase: string,
    translation: string
  ) => void;
}

/** One duplicate group: a selectable header with merge controls and, when
 * expanded, the list of phrase variants plus a preview of the merge result. */
export default function DuplicateGroupCard({
  group,
  isExpanded,
  isMerging,
  isGroupSelected,
  selected,
  onToggleSelect,
  onToggleExpand,
  onMerge,
  onSelectPhraseTranslation,
}: DuplicateGroupCardProps) {
  return (
    <div className="rounded-lg" style={{ border: "1px solid var(--border)" }}>
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
              onClick={onToggleSelect}
              className="flex items-center justify-center w-5 h-5 rounded transition-colors"
              style={{
                background: isGroupSelected ? "var(--accent)" : "transparent",
                border: `2px solid ${
                  isGroupSelected ? "var(--accent)" : "var(--border2)"
                }`,
                color: "#fff",
              }}
            >
              {isGroupSelected && <CheckSquare className="w-3 h-3" />}
            </button>
            <div>
              <h3 className="font-semibold" style={{ color: "var(--text)" }}>
                Similar to: &quot;{group.normalizedPhrase}&quot;
              </h3>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {group.phrases.length} variations found
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {selected && (
              <span
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  background: "rgba(61,220,132,.15)",
                  color: "var(--green)",
                }}
              >
                Ready to merge
              </span>
            )}
            <button
              onClick={onToggleExpand}
              className="text-sm font-medium"
              style={{ color: "var(--accent2)" }}
            >
              {isExpanded ? "Collapse" : "Review & Merge"}
            </button>
            {selected && !isGroupSelected && (
              <button
                onClick={onMerge}
                disabled={isMerging}
                className="flex items-center space-x-1 px-3 py-1 rounded text-sm disabled:opacity-50 transition-colors"
                style={{ background: "var(--green)", color: "#04210f" }}
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
          <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
            Select the best phrase and translation to keep. All other variations
            will be deleted.
          </p>

          {group.phrases.map((phrase) => (
            <PhraseVariantRow
              key={phrase.id}
              phrase={phrase}
              groupKey={group.normalizedPhrase}
              selected={selected}
              onSelect={onSelectPhraseTranslation}
            />
          ))}

          {selected && (
            <div
              className="mt-4 p-3 rounded-lg"
              style={{
                background: "rgba(91,140,255,.1)",
                border: "1px solid rgba(91,140,255,.25)",
              }}
            >
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
}
