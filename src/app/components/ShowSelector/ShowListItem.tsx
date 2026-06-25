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
          isSelected
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <button
          onClick={onSelect}
          className="flex-1 text-left flex items-center gap-3"
        >
          <Tv className="w-4 h-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900 flex items-center gap-2">
              {show.name}
              {hasExtractions && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Has data
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
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
            className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-red-900">
                Delete &ldquo;{show.name}&rdquo;?
              </div>
              <div className="text-xs text-red-700 mt-1">
                This will permanently delete the show and all its episodes.
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={onConfirmDelete}
                  disabled={isDeleting}
                  className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  onClick={onCancelDelete}
                  className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
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
