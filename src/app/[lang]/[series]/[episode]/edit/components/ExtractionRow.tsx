"use client";

import { Trash2, Edit3, AlertTriangle, FileText } from "lucide-react";

import { formatDate } from "@/utils/formatDate";

import type { EpisodeExtraction } from "../useEpisodeEdit";

interface ExtractionRowProps {
  extraction: EpisodeExtraction;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/** A single phrase-extraction row with its live/original phrase counts and the
 * edit-phrases / delete controls. */
export default function ExtractionRow({
  extraction,
  isDeleting,
  onEdit,
  onDelete,
}: ExtractionRowProps) {
  return (
    <div
      className="rounded-[var(--radius)] p-4 flex items-center justify-between transition-colors"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center space-x-3">
        <FileText className="w-5 h-5" style={{ color: "var(--faint)" }} />
        <div>
          <div className="font-medium" style={{ color: "var(--text)" }}>
            {extraction.source}
          </div>
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            {extraction.current_phrase_count} phrases
            {extraction.current_phrase_count !==
              extraction.total_phrases_found && (
              <span style={{ color: "var(--faint)" }}>
                {" "}
                (originally {extraction.total_phrases_found})
              </span>
            )}{" "}
            • {formatDate(extraction.created_at)}
            {extraction.was_truncated && (
              <span
                className="ml-2 px-2 py-1 rounded text-xs"
                style={{ background: "rgba(245,176,65,.15)", color: "var(--amber)" }}
              >
                Truncated
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {extraction.current_phrase_count > 0 ? (
          <button
            onClick={onEdit}
            className="flex items-center space-x-1 px-3 py-1 rounded-md transition-opacity hover:opacity-90 text-sm"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit Phrases</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <div
              className="text-xs px-2 py-1 rounded flex items-center space-x-1"
              style={{ background: "rgba(229,9,20,.12)", color: "var(--accent2)" }}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>No phrases remaining</span>
            </div>
          </div>
        )}

        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-1 transition-colors disabled:opacity-50 hover:opacity-80"
          style={{ color: "var(--faint)" }}
          title="Delete this extraction"
        >
          {isDeleting ? (
            <div
              className="animate-spin rounded-full h-4 w-4 border-2"
              style={{ borderColor: "var(--accent2)", borderTopColor: "transparent" }}
            ></div>
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
