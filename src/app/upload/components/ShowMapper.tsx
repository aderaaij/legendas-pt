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
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,.6)" }}>
      <div
        className="rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Map to Existing Show</h2>
              <p className="mt-1" style={{ color: "var(--muted)" }}>
                Found series: <span className="font-medium">{seriesTitle}</span>
              </p>
              <p className="text-sm" style={{ color: "var(--faint)" }}>
                {episodes.length} episodes • Choose an existing show to map episodes to
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
              <div className="flex justify-between items-center">
                <p className="text-sm" style={{ color: "var(--accent2)" }}>{error}</p>
                <button
                  onClick={clearError}
                  className="transition-colors hover:opacity-80"
                  style={{ color: "var(--accent2)" }}
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
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
                  Search Existing Shows
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-4 h-4" style={{ color: "var(--faint)" }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for existing show..."
                      className="w-full pl-10 pr-3 py-2 rounded-md focus:outline-none"
                      style={{
                        background: "var(--bg2)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
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
                  <div
                    className="rounded-lg max-h-60 overflow-y-auto"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    {filteredShows.map((show) => (
                      <div
                        key={show.id}
                        onClick={() => handleShowSelect(show)}
                        className="p-4 last:border-b-0 cursor-pointer transition-colors"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium" style={{ color: "var(--text)" }}>{show.name}</h4>
                            <p className="text-sm" style={{ color: "var(--muted)" }}>Source: {show.source}</p>
                            {show.network && (
                              <p className="text-sm" style={{ color: "var(--faint)" }}>Network: {show.network}</p>
                            )}
                            {show.genres && show.genres.length > 0 && (
                              <p className="text-sm" style={{ color: "var(--faint)" }}>
                                Genres: {show.genres.join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center" style={{ color: "var(--blue)" }}>
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
                  <Tv2 className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--faint)" }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: "var(--text)" }}>
                    No Existing Shows Found
                  </h3>
                  <p className="mb-4" style={{ color: "var(--muted)" }}>
                    No shows match &quot;{searchQuery}&quot;. You can create a new show entry.
                  </p>
                  <button
                    onClick={onCreateNewShow}
                    className="px-6 py-2 rounded-md transition-colors"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    Create New Show
                  </button>
                </div>
              )}

              {/* Episodes Preview */}
              <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
                <h3 className="text-lg font-semibold mb-3">RTP Episodes to Import</h3>
                <div
                  className="rounded-lg p-4 max-h-40 overflow-y-auto"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  <div className="grid gap-2">
                    {episodes.map((episode) => (
                      <div key={episode.id} className="text-sm">
                        <span className="font-medium">Ep. {episode.episodeNumber}</span>
                        <span className="mx-2" style={{ color: "var(--muted)" }}>{episode.title}</span>
                        <span style={{ color: "var(--faint)" }}>{episode.airDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Episode Mapping Preview */
            <div>
              <div
                className="rounded-lg p-4 mb-6"
                style={{
                  background: "rgba(91,140,255,.08)",
                  border: "1px solid rgba(91,140,255,.25)",
                }}
              >
                <h3 className="font-medium mb-2" style={{ color: "var(--blue)" }}>
                  Selected Show: {selectedShow?.name}
                </h3>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Episodes from this RTP series will be mapped to this existing show.
                </p>
              </div>

              {/* Show Episodes vs RTP Episodes Comparison */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium mb-3" style={{ color: "var(--text)" }}>
                    Existing Show Episodes {isLoadingEpisodes && '(Loading...)'}
                  </h4>
                  <div
                    className="rounded-lg max-h-60 overflow-y-auto"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    {isLoadingEpisodes ? (
                      <div className="p-4 text-center" style={{ color: "var(--faint)" }}>Loading episodes...</div>
                    ) : showEpisodes.length > 0 ? (
                      showEpisodes.map((episode) => (
                        <div
                          key={episode.id}
                          className="p-3 last:border-b-0 text-sm"
                          style={{ borderBottom: "1px solid var(--border)" }}
                        >
                          <span className="font-medium">S{episode.season}E{episode.episode_number}</span>
                          <span className="mx-2" style={{ color: "var(--muted)" }}>{episode.title}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center" style={{ color: "var(--faint)" }}>No episodes found</div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3" style={{ color: "var(--text)" }}>RTP Episodes to Import</h4>
                  <div
                    className="rounded-lg max-h-60 overflow-y-auto"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    {episodes.map((episode) => (
                      <div
                        key={episode.id}
                        className="p-3 last:border-b-0 text-sm"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <span className="font-medium">Ep. {episode.episodeNumber}</span>
                        <span className="mx-2" style={{ color: "var(--muted)" }}>{episode.title}</span>
                        <span style={{ color: "var(--faint)" }}>{episode.airDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6" style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={() => setShowEpisodePreview(false)}
                  className="px-4 py-2 rounded-md transition-colors"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border2)",
                    color: "var(--text)",
                  }}
                >
                  Back to Show Selection
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
                    onClick={handleConfirmMapping}
                    disabled={!selectedShow}
                    className="px-6 py-2 rounded-md disabled:opacity-50 transition-colors"
                    style={{ background: "var(--green)", color: "#04210f" }}
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