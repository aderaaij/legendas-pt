"use client";

import {
  Search,
  Plus,
  Loader2,
  Tv,
  Calendar,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Edit3,
} from "lucide-react";
import Image from "next/image";
import { Show, Episode, PhraseExtractionService } from "@/lib/supabase";
import { useShowSelector } from "@/hooks/useShowSelector";
import { useState } from "react";

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

  // New episode form state
  const [showNewEpisodeForm, setShowNewEpisodeForm] = useState(false);
  const [isCreatingEpisode, setIsCreatingEpisode] = useState(false);
  const [newEpisodeData, setNewEpisodeData] = useState({
    season: "",
    episodeNumber: "",
    title: "",
  });

  // Handle episode selection
  const handleEpisodeSelect = (episode: Episode) => {
    if (selectedShow) {
      onShowSelected(selectedShow, episode);
    }
  };

  // Handle show selection without episode
  const handleShowOnlySelect = () => {
    if (selectedShow) {
      onShowSelected(selectedShow);
    }
  };

  // Handle creating new episode
  const handleCreateNewEpisode = async () => {
    if (!selectedShow || !newEpisodeData.season || !newEpisodeData.episodeNumber) {
      return;
    }

    setIsCreatingEpisode(true);
    try {
      const season = parseInt(newEpisodeData.season);
      const episodeNumber = parseInt(newEpisodeData.episodeNumber);
      
      // Use provided title or fallback to default format
      const episodeTitle = newEpisodeData.title || 
        `S${season.toString().padStart(2, "0")}E${episodeNumber.toString().padStart(2, "0")}`;
      
      // Create the episode (this will automatically fetch TVDB data if available)
      const newEpisode = await PhraseExtractionService.findOrCreateEpisode(
        selectedShow.id,
        season,
        episodeNumber,
        episodeTitle
      );

      // Select the newly created episode
      onShowSelected(selectedShow, newEpisode);

      // Reset form
      setNewEpisodeData({ season: "", episodeNumber: "", title: "" });
      setShowNewEpisodeForm(false);
    } catch (err) {
      console.error("Failed to create episode:", err);
    } finally {
      setIsCreatingEpisode(false);
    }
  };

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
            {filteredShows.map((show) => {
              const hasExtractions = showsWithExtractions.has(show.id);
              const isDeleting = isDeletingShow === show.id;
              const showingDeleteConfirm = showDeleteConfirm === show.id;

              return (
                <div key={show.id} className="space-y-2">
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      selectedShow?.id === show.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <button
                      onClick={() => handleSelectExistingShow(show)}
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
                          {show.network && (
                            <span className="mr-2">📺 {show.network}</span>
                          )}
                          {show.first_aired && (
                            <span>
                              📅 {new Date(show.first_aired).getFullYear()}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {!hasExtractions && (
                      <button
                        onClick={() => setShowDeleteConfirm(show.id)}
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
                            This will permanently delete the show and all its
                            episodes.
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleDeleteShow(show)}
                              disabled={isDeleting}
                              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
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
            })}
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
              <h3 className="text-sm font-medium text-gray-700">
                TVDB Results
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {tvdbResults.map((result) => (
                  <button
                    key={result.objectID}
                    onClick={() => handleCreateShowFromTVDB(result)}
                    disabled={isCreatingShow}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-start gap-3">
                      {result.image_url && (
                        <Image
                          src={result.image_url}
                          alt={result.name}
                          width={48}
                          height={64}
                          className="w-12 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {result.name}
                        </div>
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {result.overview}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {result.network && (
                            <span className="mr-2">📺 {result.network}</span>
                          )}
                          {result.year && <span>📅 {result.year}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
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
                    className={`w-3 h-3 ${
                      isLoadingEpisodes ? "animate-spin" : ""
                    }`}
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
                onClick={handleShowOnlySelect}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Skip episode selection
              </button>
            </div>
          </div>

          {/* New Episode Form */}
          {showNewEpisodeForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-medium text-blue-900">
                  Add New Episode
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Season
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newEpisodeData.season}
                    onChange={(e) =>
                      setNewEpisodeData((prev) => ({
                        ...prev,
                        season: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Episode
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newEpisodeData.episodeNumber}
                    onChange={(e) =>
                      setNewEpisodeData((prev) => ({
                        ...prev,
                        episodeNumber: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={newEpisodeData.title}
                  onChange={(e) =>
                    setNewEpisodeData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Episode title"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateNewEpisode}
                  disabled={
                    isCreatingEpisode ||
                    !newEpisodeData.season ||
                    !newEpisodeData.episodeNumber
                  }
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingEpisode ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Episode
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowNewEpisodeForm(false)}
                  disabled={isCreatingEpisode}
                  className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
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
                  <button
                    key={episode.id}
                    onClick={() => handleEpisodeSelect(episode)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          S{episode.season?.toString().padStart(2, "0")}E
                          {episode.episode_number?.toString().padStart(2, "0")}
                          {episode.title && ` - ${episode.title}`}
                        </div>
                        {episode.overview && (
                          <div className="text-sm text-gray-600 line-clamp-2 mt-1">
                            {episode.overview}
                          </div>
                        )}
                        {episode.air_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            📅 {new Date(episode.air_date).toLocaleDateString()}
                            {episode.runtime && (
                              <span className="ml-2">
                                ⏱️ {episode.runtime}min
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
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
