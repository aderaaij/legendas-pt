"use client";

import { useState } from "react";
import { Search, Plus, Loader2, RefreshCw } from "lucide-react";

import { Show, Episode } from "@/lib/supabase";
import { useShowSelector } from "@/hooks/useShowSelector";

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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search for a show..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Existing Shows */}
      {filteredShows.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Existing Shows</h3>
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
            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
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
              <h3 className="text-sm font-medium text-gray-700">TVDB Results</h3>
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
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Episodes for &ldquo;{selectedShow.name}&rdquo;
            </h3>
            <div className="flex items-center gap-2">
              {selectedShow.tvdb_id && (
                <button
                  onClick={refreshEpisodes}
                  disabled={isLoadingEpisodes}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-700 disabled:opacity-50"
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
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3 h-3" />
                Add New Episode
              </button>
              <button
                onClick={() => onShowSelected(selectedShow)}
                className="text-sm text-blue-600 hover:text-blue-700"
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
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading episodes...
            </div>
          ) : episodes.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 px-1">
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
            <div className="text-center p-4 text-gray-500 text-sm">
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
