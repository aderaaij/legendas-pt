"use client";

import { useState } from "react";
import { Search, Save, X, Calendar, Tv, Hash, Clock } from "lucide-react";
import { Show, Episode, PhraseExtractionService } from "../../lib/supabase";
import TVDBService, { TVDBSearchResult } from "../../lib/tvdb";

interface MetadataEditorProps {
  extractionId: string;
  currentShow?: Show;
  currentEpisode?: Episode;
  onUpdate: (show?: Show, episode?: Episode) => void;
  onClose: () => void;
}

export default function MetadataEditor({
  extractionId,
  currentShow,
  currentEpisode,
  onUpdate,
  onClose,
}: MetadataEditorProps) {
  const [searchQuery, setSearchQuery] = useState(currentShow?.name || "");
  const [searchResults, setSearchResults] = useState<TVDBSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Show metadata
  const [showData, setShowData] = useState({
    name: currentShow?.name || "",
    source: currentShow?.source || "rtp",
    overview: currentShow?.overview || "",
    network: currentShow?.network || "",
    genres: currentShow?.genres?.join(", ") || "",
  });

  // Episode metadata
  const [episodeData, setEpisodeData] = useState({
    title: currentEpisode?.title || "",
    season: currentEpisode?.season || 1,
    episode_number: currentEpisode?.episode_number || 1,
    air_date: currentEpisode?.air_date || "",
    duration_minutes: currentEpisode?.duration_minutes || null,
    description: currentEpisode?.description || "",
  });

  const [selectedTVDBShow, setSelectedTVDBShow] =
    useState<TVDBSearchResult | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError("");
    try {
      const results = await TVDBService.searchShows(searchQuery);
      setSearchResults(results);
    } catch (err) {
      setError("Failed to search TVDB");
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const selectTVDBShow = async (tvdbShow: TVDBSearchResult) => {
    setSelectedTVDBShow(tvdbShow);

    try {
      // Get full show details from TVDB
      const fullShow = await TVDBService.getShowDetails(
        parseInt(tvdbShow.tvdb_id)
      );

      if (fullShow) {
        setShowData({
          name: fullShow.name,
          source: showData.source,
          overview: fullShow.overview || "",
          network: fullShow.network || "",
          genres: fullShow.genres?.join(", ") || "",
        });

        // If we have episode info and TVDB show, try to get episode details
        if (episodeData.season && episodeData.episode_number) {
          const episodeDetails = await TVDBService.getEpisodeDetails(
            fullShow.id,
            episodeData.season,
            episodeData.episode_number
          );

          if (episodeDetails) {
            setEpisodeData((prev) => ({
              ...prev,
              title: episodeDetails.name || prev.title,
              air_date: episodeDetails.aired || prev.air_date,
              duration_minutes: episodeDetails.runtime || prev.duration_minutes,
              description: episodeDetails.overview || prev.description,
            }));
          }
        }
      }
    } catch (err) {
      console.error("Error fetching TVDB details:", err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      // First, update or create the show
      let updatedShow: Show;

      if (currentShow) {
        // Update existing show
        updatedShow = await PhraseExtractionService.updateShow(currentShow.id, {
          name: showData.name,
          source: showData.source,
          overview: showData.overview,
          network: showData.network,
          genres: showData.genres
            ? showData.genres.split(",").map((g) => g.trim())
            : [],
          ...(selectedTVDBShow && {
            tvdb_id: parseInt(selectedTVDBShow.objectID),
            tvdb_slug: selectedTVDBShow.slug,
          }),
        });
      } else {
        // Create new show
        updatedShow = await PhraseExtractionService.findOrCreateShow(
          showData.name,
          showData.source
        );
      }

      // Update or create episode if we have episode data
      let updatedEpisode: Episode | undefined;
      if (episodeData.season && episodeData.episode_number) {
        if (currentEpisode) {
          updatedEpisode = await PhraseExtractionService.updateEpisode(
            currentEpisode.id,
            {
              title: episodeData.title,
              season: episodeData.season,
              episode_number: episodeData.episode_number,
              air_date: episodeData.air_date,
              duration_minutes: episodeData.duration_minutes || undefined,
              description: episodeData.description,
            }
          );
        } else {
          updatedEpisode = await PhraseExtractionService.findOrCreateEpisode(
            updatedShow.id,
            episodeData.season,
            episodeData.episode_number,
            episodeData.title
          );
        }

        // Update extraction to link to show and episode
        await PhraseExtractionService.updateExtraction(extractionId, {
          show_id: updatedShow.id,
          episode_id: updatedEpisode.id,
        });
      } else {
        // Update extraction to link to show only
        await PhraseExtractionService.updateExtraction(extractionId, {
          show_id: updatedShow.id,
        });
      }

      onUpdate(updatedShow, updatedEpisode);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save metadata: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Metadata</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* TVDB Search */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search TVDB
            </h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search for show on TVDB..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.objectID}
                    onClick={() => selectTVDBShow(result)}
                    className={`p-3 flex gap-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedTVDBShow?.objectID === result.objectID
                        ? "bg-blue-50 border-blue-200"
                        : ""
                    }`}
                  >
                    <img
                      src={result.image_url ?? ""}
                      alt={result.name}
                      className="w-30"
                    />
                    <div className="flex flex-col">
                      <div className="font-semibold text-gray-900">
                        {result.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {result.network}
                      </div>
                      {result.overview && (
                        <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {result.overview}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Show Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Tv className="w-5 h-5" />
                Show Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Show Name *
                  </label>
                  <input
                    type="text"
                    value={showData.name}
                    onChange={(e) =>
                      setShowData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter show name..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <select
                    value={showData.source}
                    onChange={(e) =>
                      setShowData((prev) => ({
                        ...prev,
                        source: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="rtp">RTP</option>
                    <option value="sic">SIC</option>
                    <option value="tvi">TVI</option>
                    <option value="netflix">Netflix</option>
                    <option value="hbo">HBO</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Network
                  </label>
                  <input
                    type="text"
                    value={showData.network}
                    onChange={(e) =>
                      setShowData((prev) => ({
                        ...prev,
                        network: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Netflix, HBO, RTP1..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Genres (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={showData.genres}
                    onChange={(e) =>
                      setShowData((prev) => ({
                        ...prev,
                        genres: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Drama, Comedy, Thriller..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Overview
                  </label>
                  <textarea
                    value={showData.overview}
                    onChange={(e) =>
                      setShowData((prev) => ({
                        ...prev,
                        overview: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of the show..."
                  />
                </div>
              </div>
            </div>

            {/* Episode Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Episode Information
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Season
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={episodeData.season}
                      onChange={(e) =>
                        setEpisodeData((prev) => ({
                          ...prev,
                          season: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Episode
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={episodeData.episode_number}
                      onChange={(e) =>
                        setEpisodeData((prev) => ({
                          ...prev,
                          episode_number: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Episode Title
                  </label>
                  <input
                    type="text"
                    value={episodeData.title}
                    onChange={(e) =>
                      setEpisodeData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Episode title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Air Date
                  </label>
                  <input
                    type="date"
                    value={episodeData.air_date}
                    onChange={(e) =>
                      setEpisodeData((prev) => ({
                        ...prev,
                        air_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={episodeData.duration_minutes || ""}
                    onChange={(e) =>
                      setEpisodeData((prev) => ({
                        ...prev,
                        duration_minutes: parseInt(e.target.value) || null,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Runtime in minutes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Episode Description
                  </label>
                  <textarea
                    value={episodeData.description}
                    onChange={(e) =>
                      setEpisodeData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of the episode..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !showData.name.trim()}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Metadata"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
