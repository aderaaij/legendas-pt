"use client";

import { Save, X } from "lucide-react";

import { Show } from "@/lib/supabase";

import ShowDetailsForm from "./ShowDetailsForm";
import ShowSearchView from "./ShowSearchView";
import { useShowTVDBCreator, type EpisodePreview } from "./useShowTVDBCreator";

interface ShowTVDBCreatorProps {
  seriesTitle: string;
  episodes: EpisodePreview[];
  season: number;
  onShowCreated: (show: Show) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export default function ShowTVDBCreator({
  seriesTitle,
  episodes,
  season,
  onShowCreated,
  onCancel,
  isOpen,
}: ShowTVDBCreatorProps) {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    creating,
    error,
    showData,
    updateShowData,
    selectedTVDBShow,
    showManualForm,
    setShowManualForm,
    handleSearch,
    selectTVDBShow,
    handleCreateShow,
    resetToSearch,
  } = useShowTVDBCreator({ seriesTitle, onShowCreated });

  if (!isOpen) return null;

  const showForm = showManualForm || selectedTVDBShow;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,.6)" }}
    >
      <div
        className="rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                Create New Show
              </h2>
              <p className="mt-1" style={{ color: "var(--muted)" }}>
                RTP Series: <span className="font-medium">{seriesTitle}</span>
              </p>
              <p className="text-sm" style={{ color: "var(--faint)" }}>
                {episodes.length} episodes • Season {season} • Link to TVDB data
                or create manually
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 transition-colors hover:opacity-80"
              style={{ color: "var(--faint)" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div
              className="rounded-lg p-3 mb-6"
              style={{
                background: "rgba(229,9,20,.1)",
                border: "1px solid rgba(229,9,20,.25)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--accent2)" }}>
                {error}
              </p>
            </div>
          )}

          {!showManualForm && !selectedTVDBShow && (
            <ShowSearchView
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSearch={handleSearch}
              searching={searching}
              searchResults={searchResults}
              onSelectResult={selectTVDBShow}
              onManual={() => setShowManualForm(true)}
            />
          )}

          {showForm && (
            <>
              <ShowDetailsForm
                showData={showData}
                onChange={updateShowData}
                selectedTVDBShow={selectedTVDBShow}
                episodes={episodes}
                season={season}
              />

              {/* Action Buttons */}
              <div
                className="flex items-center justify-between pt-6"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <button
                  onClick={resetToSearch}
                  className="px-4 py-2 rounded-md transition-colors"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border2)",
                    color: "var(--text)",
                  }}
                >
                  Back to Search
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded-md transition-colors"
                    style={{
                      background: "var(--surface2)",
                      border: "1px solid var(--border2)",
                      color: "var(--text)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateShow}
                    disabled={creating || !showData.name.trim()}
                    className="flex items-center space-x-2 px-6 py-2 rounded-md disabled:opacity-50 transition-colors"
                    style={{ background: "var(--green)", color: "#04210f" }}
                  >
                    <Save className="w-4 h-4" />
                    <span>{creating ? "Creating..." : "Create Show"}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
