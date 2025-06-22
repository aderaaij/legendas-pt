'use client';

import { useState } from 'react';
import {
  Search,
  Save,
  X,
  Tv,
  Hash,
  ExternalLink,
  Plus
} from 'lucide-react';
import Image from 'next/image';
import { Show } from '@/lib/supabase';
import TVDBService, { TVDBSearchResult } from '@/lib/tvdb';

interface ShowTVDBCreatorProps {
  seriesTitle: string;
  episodes: Array<{
    episodeNumber: number;
    title: string;
    airDate: string;
    id: string;
  }>;
  onShowCreated: (show: Show) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export default function ShowTVDBCreator({
  seriesTitle,
  episodes,
  onShowCreated,
  onCancel,
  isOpen
}: ShowTVDBCreatorProps) {
  const [searchQuery, setSearchQuery] = useState(seriesTitle);
  const [searchResults, setSearchResults] = useState<TVDBSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Show metadata state
  const [showData, setShowData] = useState({
    name: seriesTitle,
    source: 'rtp',
    overview: '',
    network: '',
    genres: '',
    watch_url: '',
    poster_url: '',
  });

  const [selectedTVDBShow, setSelectedTVDBShow] = useState<TVDBSearchResult | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError('');
    try {
      const results = await TVDBService.searchShows(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setShowManualForm(true);
      }
    } catch (err) {
      setError('Failed to search TVDB');
      console.error('Search error:', err);
      setShowManualForm(true);
    } finally {
      setSearching(false);
    }
  };

  const selectTVDBShow = async (tvdbShow: TVDBSearchResult) => {
    setSelectedTVDBShow(tvdbShow);

    try {
      // Update with search result data
      setShowData((prev) => ({
        ...prev,
        name: tvdbShow.name,
        poster_url: tvdbShow.image_url || prev.poster_url,
      }));

      // Get full show details from TVDB
      const fullShow = await TVDBService.getShowDetails(parseInt(tvdbShow.tvdb_id));

      if (fullShow) {
        setShowData({
          name: fullShow.name,
          source: 'rtp',
          overview: fullShow.overview || '',
          network: fullShow.network || '',
          genres: fullShow.genres?.join(', ') || '',
          watch_url: '', // Keep empty for user to fill
          poster_url: fullShow.image || tvdbShow.image_url || '',
        });
      }
    } catch (err) {
      console.error('Error fetching TVDB details:', err);
      setError('Failed to fetch show details from TVDB');
    }
  };

  const handleCreateShow = async () => {
    if (!showData.name.trim()) {
      setError('Show name is required');
      return;
    }

    setCreating(true);
    setError('');

    try {
      // Create show data object
      const createData: {
        name: string;
        source: string;
        overview: string | null;
        network: string | null;
        genres: string[];
        watch_url: string | null;
        poster_url: string | null;
        tvdb_id?: number;
        tvdb_slug?: string;
      } = {
        name: showData.name,
        source: showData.source,
        overview: showData.overview || null,
        network: showData.network || null,
        genres: showData.genres
          ? showData.genres
              .split(',')
              .map((g) => g.trim())
              .filter((g) => g.length > 0)
          : [],
        watch_url: showData.watch_url || null,
        poster_url: showData.poster_url || null,
      };

      // Add TVDB fields if we have a selected show
      if (selectedTVDBShow && selectedTVDBShow.objectID && selectedTVDBShow.slug) {
        createData.tvdb_id = parseInt(selectedTVDBShow.objectID);
        createData.tvdb_slug = selectedTVDBShow.slug;
      }

      // Call API to create show
      const response = await fetch('/api/shows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create show');
      }

      const createdShow = await response.json();
      onShowCreated(createdShow);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create show: ${errorMessage}`);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Show</h2>
              <p className="text-gray-600 mt-1">
                RTP Series: <span className="font-medium">{seriesTitle}</span>
              </p>
              <p className="text-sm text-gray-500">
                {episodes.length} episodes • Link to TVDB data or create manually
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
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {!showManualForm && !selectedTVDBShow && (
            <>
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
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search for show on TVDB..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto mb-4">
                    {searchResults.map((result) => (
                      <div
                        key={result.objectID}
                        onClick={() => selectTVDBShow(result)}
                        className="p-3 flex gap-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <Image
                          src={result.image_url ?? ''}
                          alt={result.name}
                          width={60}
                          height={80}
                          className="w-15 h-20 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{result.name}</div>
                          <div className="text-sm text-gray-600">{result.network}</div>
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

                <div className="text-center">
                  <button
                    onClick={() => setShowManualForm(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Create manually without TVDB data
                  </button>
                </div>
              </div>
            </>
          )}

          {(showManualForm || selectedTVDBShow) && (
            <>
              {selectedTVDBShow && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                    <Tv className="w-5 h-5" />
                    TVDB Show Selected: {selectedTVDBShow.name}
                  </h3>
                  <p className="text-green-700 text-sm">
                    Show data has been pre-filled from TVDB. You can modify any fields before creating.
                  </p>
                </div>
              )}

              {/* Show Form */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                          setShowData((prev) => ({ ...prev, source: e.target.value }))
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
                          setShowData((prev) => ({ ...prev, network: e.target.value }))
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
                          setShowData((prev) => ({ ...prev, genres: e.target.value }))
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
                          setShowData((prev) => ({ ...prev, overview: e.target.value }))
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Brief description of the show..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <ExternalLink className="w-4 h-4" />
                        Watch URL
                      </label>
                      <input
                        type="url"
                        value={showData.watch_url}
                        onChange={(e) =>
                          setShowData((prev) => ({ ...prev, watch_url: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/show-name"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Link where users can watch this show
                      </p>
                    </div>
                  </div>
                </div>

                {/* Episodes Preview */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Hash className="w-5 h-5" />
                    Episodes to Import
                  </h3>
                  <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                    {episodes.map((episode) => (
                      <div key={episode.id} className="p-3 border-b last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium">Ep. {episode.episodeNumber}</span>
                            <span className="ml-2 text-gray-600">{episode.title}</span>
                          </div>
                          <span className="text-sm text-gray-500">{episode.airDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowManualForm(false);
                    setSelectedTVDBShow(null);
                    setShowData({
                      name: seriesTitle,
                      source: 'rtp',
                      overview: '',
                      network: '',
                      genres: '',
                      watch_url: '',
                      poster_url: '',
                    });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Back to Search
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateShow}
                    disabled={creating || !showData.name.trim()}
                    className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>{creating ? 'Creating...' : 'Create Show'}</span>
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