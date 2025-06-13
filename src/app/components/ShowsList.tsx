"use client";

import { useState, useEffect } from "react";
import {
  Play,
  Edit3,
  FileText,
  TrendingUp,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  PhraseExtractionService,
  Show,
  Episode,
  PhraseExtraction,
} from "../../lib/supabase";
import { formatDate } from "@/utils/formatDate";

interface ShowWithStats extends Show {
  episode_count: number;
  extraction_count: number;
  total_phrases: number;
  last_extraction: string | null;
}

interface EpisodeWithStats extends Episode {
  extraction_count: number;
  total_phrases: number;
  last_extraction: string | null;
}

interface ShowsListProps {
  onEditExtraction: (
    extractionId: string,
    showName: string,
    episodeTitle?: string
  ) => void;
}

export default function ShowsList({ onEditExtraction }: ShowsListProps) {
  const [shows, setShows] = useState<ShowWithStats[]>([]);
  const [expandedShow, setExpandedShow] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<Record<string, EpisodeWithStats[]>>(
    {}
  );
  const [extractions, setExtractions] = useState<
    Record<string, PhraseExtraction[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadShows();
  }, []);

  const loadShows = async () => {
    try {
      setLoading(true);

      const stats = await PhraseExtractionService.getExtractionStats();

      // Group by shows and calculate stats
      const showsMap = new Map<string, ShowWithStats>();

      for (const stat of stats) {
        const showName = stat.show?.name || "Unknown Show";
        const showId = showName;

        if (!showsMap.has(showId)) {
          showsMap.set(showId, {
            id: showId,
            name: showName,
            source: stat.source || "unknown",
            language: "pt",
            created_at: stat.created_at || new Date().toISOString(),
            updated_at: stat.created_at || new Date().toISOString(),
            episode_count: 0,
            extraction_count: 0,
            total_phrases: 0,
            last_extraction: null,
          });
        }

        const show = showsMap.get(showId)!;
        show.extraction_count += 1;
        show.total_phrases += stat.total_phrases_found || 0;

        if (
          !show.last_extraction ||
          (stat.created_at && stat.created_at > show.last_extraction)
        ) {
          show.last_extraction = stat.created_at || new Date().toISOString();
        }
      }

      const showsArray = Array.from(showsMap.values());
      setShows(showsArray);
    } catch (err) {
      setError(
        `Failed to load shows: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error loading shows:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadEpisodes = async (showId: string) => {
    if (extractions[showId]) return; // Already loaded

    try {
      const stats = await PhraseExtractionService.getExtractionStats();
      const showExtractions = stats.filter(
        (stat) => (stat.show?.name || "Unknown Show") === showId
      );

      setExtractions((prev) => ({
        ...prev,
        [showId]: showExtractions as any[], // Using any since the structure differs from PhraseExtraction
      }));
    } catch (err) {
      console.error("Error loading episodes:", err);
    }
  };

  const toggleShow = async (showId: string) => {
    if (expandedShow === showId) {
      setExpandedShow(null);
    } else {
      setExpandedShow(showId);
      await loadEpisodes(showId);
    }
  };

  const deleteExtraction = async (extractionId: string, showId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this extraction? This will delete all associated phrases and cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeleting(extractionId);
      await PhraseExtractionService.deleteExtraction(extractionId);

      // Remove from local state
      setExtractions((prev) => ({
        ...prev,
        [showId]: prev[showId]?.filter((ext) => ext.id !== extractionId) || [],
      }));

      // Reload shows to update counts
      await loadShows();
    } catch (err) {
      setError(
        `Failed to delete extraction: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error deleting extraction:", err);
    } finally {
      setDeleting(null);
    }
  };

  const deleteShow = async (showId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this entire show? This will delete ALL extractions and phrases for this show and cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeleting(showId);

      // Find the actual show database ID
      const stats = await PhraseExtractionService.getExtractionStats();
      const showExtractions = stats.filter(
        (stat) => (stat.show?.name || "Unknown Show") === showId
      );

      if (showExtractions.length > 0) {
        // Delete all extractions for this show
        for (const extraction of showExtractions) {
          await PhraseExtractionService.deleteExtraction(extraction.id);
        }
      }

      // Reload shows
      await loadShows();
      setExpandedShow(null);
      setExtractions((prev) => {
        const newExtractions = { ...prev };
        delete newExtractions[showId];
        return newExtractions;
      });
    } catch (err) {
      setError(
        `Failed to delete show: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error deleting show:", err);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading shows...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadShows}
          className="mt-2 text-red-700 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (shows.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No shows found
        </h3>
        <p className="text-gray-500">
          Upload some subtitle files to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Your Shows & Episodes
        </h2>
        <div className="text-sm text-gray-500">
          {shows.length} shows •{" "}
          {shows.reduce((acc, show) => acc + show.total_phrases, 0)} total
          phrases
        </div>
      </div>

      {shows.map((show) => (
        <div
          key={show.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          {/* Show Header */}
          <div
            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleShow(show.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Play
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedShow === show.id ? "rotate-90" : ""
                  }`}
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{show.name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Source: {show.source}</span>
                    <span>•</span>
                    <span>{show.extraction_count} extractions</span>
                    <span>•</span>
                    <span>{show.total_phrases} phrases</span>
                    {show.last_extraction && (
                      <>
                        <span>•</span>
                        <span>Last: {formatDate(show.last_extraction)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                  {show.total_phrases} phrases
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteShow(show.id);
                  }}
                  disabled={deleting === show.id}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  title="Delete entire show"
                >
                  {deleting === show.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Episodes/Extractions List */}
          {expandedShow === show.id && (
            <div className="border-t border-gray-200 bg-gray-50">
              {extractions[show.id]?.length > 0 ? (
                <div className="p-4 space-y-2">
                  {extractions[show.id].map((extraction) => (
                    <div
                      key={extraction.id}
                      className="bg-white rounded-md p-3 flex items-center justify-between hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {extraction.source}
                          </div>
                          <div className="text-sm text-gray-500">
                            {extraction.total_phrases_found} phrases •{" "}
                            {formatDate(extraction.created_at)}
                            {extraction.was_truncated && (
                              <span className="ml-2 bg-yellow-100 text-yellow-800 px-1 rounded text-xs">
                                Truncated
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {extraction.total_phrases_found > 0 ? (
                          <button
                            onClick={() =>
                              onEditExtraction(
                                extraction.id,
                                show.name,
                                extraction.source
                              )
                            }
                            className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Phrases</span>
                          </button>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>No phrases saved</span>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() =>
                            deleteExtraction(extraction.id, show.id)
                          }
                          disabled={deleting === extraction.id}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Delete this extraction"
                        >
                          {deleting === extraction.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No extractions found for this show
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
