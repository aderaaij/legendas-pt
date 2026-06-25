"use client";

import { Tv, Loader2, Trash2, AlertTriangle } from "lucide-react";

import { Show } from "@/lib/supabase";

interface ShowListItemProps {
  show: Show;
  isSelected: boolean;
  hasExtractions: boolean;
  isDeleting: boolean;
  showingDeleteConfirm: boolean;
  onSelect: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

/** A single existing-show row with its select action and inline delete confirm. */
export default function ShowListItem({
  show,
  isSelected,
  hasExtractions,
  isDeleting,
  showingDeleteConfirm,
  onSelect,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: ShowListItemProps) {
  return (
    <div className="space-y-2">
      <div
        className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
          isSelected ? "" : "hover:bg-[rgba(255,255,255,0.04)]"
        }`}
        style={{
          borderColor: isSelected ? "var(--blue)" : "var(--border)",
          background: isSelected ? "rgba(91,140,255,.12)" : "transparent",
        }}
      >
        <button
          onClick={onSelect}
          className="flex-1 text-left flex items-center gap-3"
        >
          <Tv className="w-4 h-4" style={{ color: "var(--faint)" }} />
          <div>
            <div
              className="font-medium flex items-center gap-2"
              style={{ color: "var(--text)" }}
            >
              {show.name}
              {hasExtractions && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(61,220,132,.15)",
                    color: "var(--green)",
                  }}
                >
                  Has data
                </span>
              )}
            </div>
            <div className="text-sm" style={{ color: "var(--faint)" }}>
              {show.network && <span className="mr-2">📺 {show.network}</span>}
              {show.first_aired && (
                <span>📅 {new Date(show.first_aired).getFullYear()}</span>
              )}
            </div>
          </div>
        </button>

        {!hasExtractions && (
          <button
            onClick={onRequestDelete}
            disabled={isDeleting}
            className="p-1 transition-colors disabled:opacity-50 hover:text-[var(--accent2)]"
            style={{ color: "var(--faint)" }}
            title="Delete show"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {showingDeleteConfirm && (
        <div
          className="rounded-lg p-3"
          style={{
            background: "rgba(229,9,20,.08)",
            border: "1px solid rgba(229,9,20,.25)",
          }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="w-4 h-4 mt-0.5"
              style={{ color: "var(--accent2)" }}
            />
            <div className="flex-1">
              <div
                className="text-sm font-medium"
                style={{ color: "var(--accent2)" }}
              >
                Delete &ldquo;{show.name}&rdquo;?
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                This will permanently delete the show and all its episodes.
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={onConfirmDelete}
                  disabled={isDeleting}
                  className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  onClick={onCancelDelete}
                  className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-90"
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
          </div>
        </div>
      )}
    </div>
  );
}
