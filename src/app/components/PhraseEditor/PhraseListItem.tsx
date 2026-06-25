"use client";

import { Save, Trash2, Edit3 } from "lucide-react";

import { ExtractedPhrase } from "@/lib/supabase";
import { FormField } from "@/app/components/ui/FormField";

import type { EditablePhrase } from "./usePhraseEditor";

interface PhraseListItemProps {
  phrase: EditablePhrase;
  saving: boolean;
  onStartEdit: (id: string) => void;
  onCancelEdit: (id: string) => void;
  onUpdateField: (
    id: string,
    field: keyof ExtractedPhrase,
    value: string
  ) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => void;
}

/** A single phrase row with inline edit and view modes, including the
 * duplicate / unsaved-change highlighting. */
export default function PhraseListItem({
  phrase,
  saving,
  onStartEdit,
  onCancelEdit,
  onUpdateField,
  onSave,
  onDelete,
}: PhraseListItemProps) {
  return (
    <div
      className="rounded-lg p-4 transition-all"
      style={{
        background: phrase.hasChanges
          ? "rgba(245,196,81,.08)"
          : phrase.isDuplicate
          ? "rgba(245,166,35,.08)"
          : "var(--surface)",
        border: `1px solid ${
          phrase.hasChanges
            ? "rgba(245,196,81,.4)"
            : phrase.isDuplicate
            ? "rgba(245,166,35,.4)"
            : "var(--border)"
        }`,
      }}
    >
      {phrase.isEditing ? (
        /* Edit Mode */
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              label="Portuguese Phrase"
              value={phrase.phrase}
              onChange={(value) => onUpdateField(phrase.id, "phrase", value)}
            />
            <FormField
              label="English Translation"
              value={phrase.translation}
              onChange={(value) =>
                onUpdateField(phrase.id, "translation", value)
              }
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onSave(phrase.id)}
              disabled={saving}
              className="flex items-center space-x-1 px-3 py-1 rounded text-sm disabled:opacity-50 transition-colors"
              style={{ background: "var(--green)", color: "#04210f" }}
            >
              <Save className="w-3 h-3" />
              <span>{saving ? "Saving..." : "Save"}</span>
            </button>
            <button
              onClick={() => onCancelEdit(phrase.id)}
              className="px-3 py-1 rounded text-sm transition-colors"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border2)",
                color: "var(--text)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* View Mode */
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <div className="font-semibold" style={{ color: "var(--text)" }}>
                {phrase.phrase}
              </div>
              {phrase.isDuplicate && (
                <span
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: "rgba(245,166,35,.15)",
                    color: "var(--amber)",
                  }}
                >
                  Duplicate ({phrase.duplicateCount})
                </span>
              )}
            </div>
            <div className="mb-2" style={{ color: "var(--muted)" }}>
              {phrase.translation}
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-4">
            <button
              onClick={() => onStartEdit(phrase.id)}
              className="p-1 transition-colors"
              style={{ color: "var(--faint)" }}
              title="Edit phrase"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(phrase.id)}
              className="p-1 transition-colors"
              style={{ color: "var(--faint)" }}
              title="Delete phrase"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
