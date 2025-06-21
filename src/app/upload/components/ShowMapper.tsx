'use client';

import { useState } from 'react';
import { Search, Check, X, Tv2 } from 'lucide-react';
import { Show } from '@/lib/supabase';
import { useShowSelector } from '@/hooks/useShowSelector';

interface ShowMapperProps {
  seriesTitle: string;
  episodes: Array<{
    episodeNumber: number;
    title: string;
    airDate: string;
    id: string;
  }>;
  onShowSelected: (show: Show) => void;
  onCreateNewShow: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

export default function ShowMapper({
  seriesTitle,
  episodes,
  onShowSelected,
  onCreateNewShow,
  onCancel,
  isOpen
}: ShowMapperProps) {
  const {
    searchQuery,
    setSearchQuery,
    filteredShows,
    showTVDBResults,
    selectedShow,
    episodes: showEpisodes,
    isLoadingEpisodes,
    handleSelectExistingShow,
    error,
    clearError,
  } = useShowSelector();

  const [showEpisodePreview, setShowEpisodePreview] = useState(false);

  const handleShowSelect = async (show: Show) => {
    await handleSelectExistingShow(show);
    setShowEpisodePreview(true);
  };

  const handleConfirmMapping = () => {
    if (selectedShow) {
      onShowSelected(selectedShow);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Map to Existing Show</h2>
              <p className="text-gray-600 mt-1">
                Found series: <span className="font-medium">{seriesTitle}</span>
              </p>
              <p className="text-sm text-gray-500">
                {episodes.length} episodes • Choose an existing show to map episodes to
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <div className="flex justify-between items-center">
                <p className="text-red-600 text-sm">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {!showEpisodePreview ? (
            <>
              {/* Search Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Existing Shows
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for existing show..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Existing Shows List */}
              {filteredShows.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Tv2 className="w-5 h-5" />
                    Existing Shows
                  </h3>
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {filteredShows.map((show) => (
                      <div
                        key={show.id}
                        onClick={() => handleShowSelect(show)}
                        className="p-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{show.name}</h4>
                            <p className="text-sm text-gray-600">Source: {show.source}</p>
                            {show.network && (
                              <p className="text-sm text-gray-500">Network: {show.network}</p>
                            )}
                            {show.genres && show.genres.length > 0 && (
                              <p className="text-sm text-gray-500">
                                Genres: {show.genres.join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center text-blue-600">
                            <span className="text-sm mr-2">Select</span>
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results / Create New Show Option */}
              {showTVDBResults && (
                <div className="text-center py-8">
                  <Tv2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Existing Shows Found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    No shows match &quot;{searchQuery}&quot;. You can create a new show entry.
                  </p>
                  <button
                    onClick={onCreateNewShow}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Create New Show
                  </button>
                </div>
              )}

              {/* Episodes Preview */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-3">RTP Episodes to Import</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <div className="grid gap-2">
                    {episodes.map((episode) => (
                      <div key={episode.id} className="text-sm">
                        <span className="font-medium">Ep. {episode.episodeNumber}</span>
                        <span className="mx-2 text-gray-600">{episode.title}</span>
                        <span className="text-gray-500">{episode.airDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Episode Mapping Preview */
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-800 mb-2">
                  Selected Show: {selectedShow?.name}
                </h3>
                <p className="text-blue-700 text-sm">
                  Episodes from this RTP series will be mapped to this existing show.
                </p>
              </div>

              {/* Show Episodes vs RTP Episodes Comparison */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Existing Show Episodes {isLoadingEpisodes && '(Loading...)'}
                  </h4>
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {isLoadingEpisodes ? (
                      <div className="p-4 text-center text-gray-500">Loading episodes...</div>
                    ) : showEpisodes.length > 0 ? (
                      showEpisodes.map((episode) => (
                        <div key={episode.id} className="p-3 border-b last:border-b-0 text-sm">
                          <span className="font-medium">S{episode.season}E{episode.episode_number}</span>
                          <span className="mx-2 text-gray-600">{episode.title}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">No episodes found</div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">RTP Episodes to Import</h4>
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {episodes.map((episode) => (
                      <div key={episode.id} className="p-3 border-b last:border-b-0 text-sm">
                        <span className="font-medium">Ep. {episode.episodeNumber}</span>
                        <span className="mx-2 text-gray-600">{episode.title}</span>
                        <span className="text-gray-500">{episode.airDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowEpisodePreview(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Back to Show Selection
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmMapping}
                    disabled={!selectedShow}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    Confirm Mapping
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}