"use client";

import { useState } from "react";
import { Search, Plus, Loader2, RefreshCw } from "lucide-react";

import { Show, Episode } from "@/lib/supabase";
import { useShowSelector } from "@/hooks/useShowSelector";
import { fieldInputStyle } from "@/app/components/ui/FormField";

import EpisodeListItem from "./EpisodeListItem";
import NewEpisodeForm from "./NewEpisodeForm";
import ShowListItem from "./ShowListItem";
import TVDBResultButton from "./TVDBResultButton";

interface ShowSelectorProps {
  onShowSelected: (show: Show, episode?: Episode) => void;
  selectedShowId?: string;
  selectedEpisodeId?: string;
}

export default function ShowSelector({ onShowSelected }: ShowSelectorProps) {
  const {
    searchQuery,
    filteredShows,
    isSearchingTVDB,
    tvdbResults,
    showTVDBResults,
    selectedShow,
    episodes,
    isLoadingEpisodes,
    isCreatingShow,
    error,
    showsWithExtractions,
    isDeletingShow,
    showDeleteConfirm,
    setSearchQuery,
    setShowDeleteConfirm,
    searchTVDB,
    handleSelectExistingShow,
    handleCreateShowFromTVDB,
    refreshEpisodes,
    handleDeleteShow,
  } = useShowSelector();

  const [showNewEpisodeForm, setShowNewEpisodeForm] = useState(false);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--faint)" }}
        />
        <input
          type="text"
          placeholder="Search for a show..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none"
          style={fieldInputStyle}
        />
      </div>

      {error && (
        <div
          className="text-sm p-3 rounded-lg"
          style={{ background: "rgba(229,9,20,.1)", color: "var(--accent2)" }}
        >
          {error}
        </div>
      )}

      {/* Existing Shows */}
      {filteredShows.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            Existing Shows
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredShows.map((show) => (
              <ShowListItem
                key={show.id}
                show={show}
                isSelected={selectedShow?.id === show.id}
                hasExtractions={showsWithExtractions.has(show.id)}
                isDeleting={isDeletingShow === show.id}
                showingDeleteConfirm={showDeleteConfirm === show.id}
                onSelect={() => handleSelectExistingShow(show)}
                onRequestDelete={() => setShowDeleteConfirm(show.id)}
                onConfirmDelete={() => handleDeleteShow(show)}
                onCancelDelete={() => setShowDeleteConfirm(null)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add New Show Button */}
      {showTVDBResults && (
        <div className="space-y-3">
          <button
            onClick={searchTVDB}
            disabled={isSearchingTVDB || !searchQuery.trim()}
            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: "var(--border2)", color: "var(--muted)" }}
          >
            {isSearchingTVDB ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching TVDB...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add new show &ldquo;{searchQuery}&rdquo;
              </>
            )}
          </button>

          {/* TVDB Search Results */}
          {tvdbResults.length > 0 && (
            <div className="space-y-2">
              <h3
                className="text-sm font-medium"
                style={{ color: "var(--muted)" }}
              >
                TVDB Results
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {tvdbResults.map((result) => (
                  <TVDBResultButton
                    key={result.objectID}
                    result={result}
                    isCreatingShow={isCreatingShow}
                    onSelect={() => handleCreateShowFromTVDB(result)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Episode Selection */}
      {selectedShow && (
        <div
          className="space-y-3 pt-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <h3
              className="text-sm font-medium"
              style={{ color: "var(--muted)" }}
            >
              Episodes for &ldquo;{selectedShow.name}&rdquo;
            </h3>
            <div className="flex items-center gap-2">
              {selectedShow.tvdb_id && (
                <button
                  onClick={refreshEpisodes}
                  disabled={isLoadingEpisodes}
                  className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ color: "var(--muted)" }}
                  title="Refresh episodes from TVDB"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isLoadingEpisodes ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              )}
              <button
                onClick={() => setShowNewEpisodeForm(!showNewEpisodeForm)}
                className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
                style={{ color: "var(--blue)" }}
              >
                <Plus className="w-3 h-3" />
                Add New Episode
              </button>
              <button
                onClick={() => onShowSelected(selectedShow)}
                className="text-sm transition-opacity hover:opacity-80"
                style={{ color: "var(--blue)" }}
              >
                Skip episode selection
              </button>
            </div>
          </div>

          {showNewEpisodeForm && (
            <NewEpisodeForm
              selectedShow={selectedShow}
              onCreated={(episode) => {
                onShowSelected(selectedShow, episode);
                setShowNewEpisodeForm(false);
              }}
              onCancel={() => setShowNewEpisodeForm(false)}
            />
          )}

          {isLoadingEpisodes ? (
            <div
              className="flex items-center justify-center p-4"
              style={{ color: "var(--muted)" }}
            >
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading episodes...
            </div>
          ) : episodes.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs px-1" style={{ color: "var(--faint)" }}>
                {episodes.length} episodes found
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {episodes.map((episode) => (
                  <EpisodeListItem
                    key={episode.id}
                    episode={episode}
                    onSelect={() => onShowSelected(selectedShow, episode)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div
              className="text-center p-4 text-sm"
              style={{ color: "var(--muted)" }}
            >
              {selectedShow?.tvdb_id
                ? "No episodes available for this show."
                : "This show doesn't have TVDB data. Episodes cannot be loaded."}
              <br />
              You can still proceed with show-only selection.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
