"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Edit3,
  AlertTriangle,
  FileText,
} from "lucide-react";
import Link from "next/link";

import { PhraseExtractionService, Show, Episode, supabase } from "@/lib/supabase";
import { parseShowSlug, normalizeShowName, generateShowSlug } from "@/utils/slugify";
import { formatDate } from "@/utils/formatDate";
import MetadataEditor from "@/app/components/MetadataEditor";
import PhraseEditor from "@/app/components/PhraseEditor";

type ViewMode = "edit" | "phrase-edit";

interface EditingSession {
  extractionId: string;
  showName: string;
  episodeTitle?: string;
}

export default function ShowEditPage() {
  const params = useParams();
  const router = useRouter();
  const series = params.series as string;

  const [show, setShow] = useState<Show | null>(null);
  const [episodes, setEpisodes] = useState<(Episode & { extractionCount: number; totalPhrases: number; lastExtraction: string | null })[]>([]);
  const [extractions, setExtractions] = useState<(any & { current_phrase_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [editingSession, setEditingSession] = useState<EditingSession | null>(null);

  const loadShowData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Parse the series slug to get show information
      const parsedSlug = parseShowSlug(series);

      // Find the actual show in the database
      const shows = await PhraseExtractionService.getAllShows();
      const normalizedSlugName = normalizeShowName(parsedSlug.showName);
      
      const matchingShow = shows.find(s => 
        normalizeShowName(s.name) === normalizedSlugName ||
        normalizeShowName(s.name).includes(normalizedSlugName) ||
        normalizedSlugName.includes(normalizeShowName(s.name))
      );

      if (!matchingShow) {
        setError("Show not found");
        return;
      }

      setShow(matchingShow);

      // Load episodes for this show
      const showEpisodes = await PhraseExtractionService.getEpisodesWithExtractionStats(matchingShow.id);
      setEpisodes(showEpisodes);

      // Load extractions for this show with current phrase counts
      const { data: showExtractions, error: extractionsError } = await supabase
        .from("phrase_extractions")
        .select(`
          id,
          source,
          total_phrases_found,
          created_at,
          was_truncated,
          show:shows(name),
          episode:episodes(season, episode_number, title)
        `)
        .eq("show_id", matchingShow.id)
        .order("created_at", { ascending: false });

      if (extractionsError) {
        console.error("Error loading extractions:", extractionsError);
        setExtractions([]);
      } else {
        // Enhance extractions with current phrase counts
        const extractionsWithCounts = await Promise.all(
          (showExtractions || []).map(async (extraction) => {
            const { data: currentPhrases } = await supabase
              .from("extracted_phrases")
              .select("id")
              .eq("extraction_id", extraction.id);
            
            return {
              ...extraction,
              current_phrase_count: currentPhrases?.length || 0
            };
          })
        );
        setExtractions(extractionsWithCounts);
      }
    } catch (err) {
      setError(
        `Failed to load show data: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error loading show data:", err);
    } finally {
      setLoading(false);
    }
  }, [series]);

  useEffect(() => {
    loadShowData();
  }, [loadShowData]);

  const handleEditExtraction = (
    extractionId: string,
    showName: string,
    episodeTitle?: string
  ) => {
    setEditingSession({ extractionId, showName, episodeTitle });
    setViewMode("phrase-edit");
  };

  const handleBackFromPhraseEdit = () => {
    setEditingSession(null);
    setViewMode("edit");
  };

  const deleteExtraction = async (extractionId: string) => {
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
      
      // Reload data
      await loadShowData();
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

  const deleteShow = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this entire show? This will delete ALL extractions and phrases for this show and cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeleting(show!.id);

      // Delete all extractions for this show
      for (const extraction of extractions) {
        await PhraseExtractionService.deleteExtraction(extraction.id);
      }

      // Navigate back to home
      router.push("/");
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

  const handleMetadataUpdate = (updatedShow?: Show, updatedEpisode?: Episode) => {
    if (updatedShow) {
      setShow(updatedShow);
    }
    setShowMetadataEditor(false);
    // Reload data to get fresh stats
    loadShowData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading show...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "phrase-edit" && editingSession) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <PhraseEditor
            extractionId={editingSession.extractionId}
            showName={editingSession.showName}
            episodeTitle={editingSession.episodeTitle}
            onBack={handleBackFromPhraseEdit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-red-200 to-green-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col justify-between mb-8">
          <div className="flex flex-col gap-2">
            {/* Breadcrumb navigation */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-gray-800 transition-colors">
                Shows
              </Link>
              <span>/</span>
              <Link
                href={`/${generateShowSlug(show!.name)}`}
                className="hover:text-gray-800 transition-colors"
              >
                {show?.name}
              </Link>
              <span>/</span>
              <span className="text-gray-900">Edit</span>
            </div>

            <Link
              href={`/${generateShowSlug(show!.name)}`}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Episodes</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Edit {show?.name}
              </h1>
              <p className="text-gray-600">
                Manage show metadata, episodes, and phrase extractions
              </p>
            </div>
          </div>
        </div>

        {/* Show Management */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Show Settings</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowMetadataEditor(true)}
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Metadata</span>
              </button>
              <button
                onClick={deleteShow}
                disabled={deleting === show!.id}
                className="inline-flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting === show!.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Delete Show</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {episodes.length}
              </div>
              <div className="text-sm text-gray-600">Episodes</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {extractions.length}
              </div>
              <div className="text-sm text-gray-600">Extractions</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {extractions.reduce((acc, ext) => acc + (ext.current_phrase_count || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Current Phrases</div>
            </div>
          </div>
        </div>

        {/* Extractions Management */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Phrase Extractions</h2>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {extractions.length} extractions
            </span>
          </div>

          {extractions.length > 0 ? (
            <div className="space-y-3">
              {extractions.map((extraction) => (
                <div
                  key={extraction.id}
                  className="bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {extraction.source}
                      </div>
                      <div className="text-sm text-gray-500">
                        {extraction.current_phrase_count} phrases
                        {extraction.current_phrase_count !== extraction.total_phrases_found && (
                          <span className="text-gray-400">
                            {" "}(originally {extraction.total_phrases_found})
                          </span>
                        )}
                        {" "}• {formatDate(extraction.created_at)}
                        {extraction.was_truncated && (
                          <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                            Truncated
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {extraction.current_phrase_count > 0 ? (
                      <button
                        onClick={() =>
                          handleEditExtraction(
                            extraction.id,
                            show!.name,
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
                          <span>No phrases remaining</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => deleteExtraction(extraction.id)}
                      disabled={deleting === extraction.id}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Delete this extraction"
                    >
                      {deleting === extraction.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Extractions Found
              </h3>
              <p className="text-gray-600">
                This show doesn&apos;t have any phrase extractions yet.
              </p>
            </div>
          )}
        </div>

        {/* Metadata Editor Modal */}
        {showMetadataEditor && show && (
          <MetadataEditor
            extractionId="" // Not needed for show-level editing
            currentShow={show}
            onUpdate={handleMetadataUpdate}
            onClose={() => setShowMetadataEditor(false)}
          />
        )}
      </div>
    </div>
  );
}