"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Trash2,
  Edit3,
  AlertTriangle,
  FileText,
  Calendar,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import {
  PhraseExtractionService,
  Show,
  Episode,
  ExtractedPhrase,
  supabase,
} from "@/lib/supabase";
import {
  parseShowSlug,
  normalizeShowName,
  generateShowSlug,
} from "@/utils/slugify";
import { formatDate } from "@/utils/formatDate";
import MetadataEditor from "@/app/components/MetadataEditor";
import PhraseEditor from "@/app/components/PhraseEditor";
import { AdminRoute } from "@/app/components/ProtectedRoute";
import Breadcrumb from "@/app/components/Breadcrumb";

type ViewMode = "edit" | "phrase-edit";

interface EditingSession {
  extractionId: string;
  showName: string;
  episodeTitle?: string;
}

export default function EpisodeEditPage() {
  const params = useParams();
  const router = useRouter();
  const series = params.series as string;
  const episode = params.episode as string;

  const [show, setShow] = useState<Show | null>(null);
  const [episodeData, setEpisodeData] = useState<Episode | null>(null);
  const [phrases, setPhrases] = useState<ExtractedPhrase[]>([]);
  const [extractions, setExtractions] = useState<
    (any & { current_phrase_count: number })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [editingSession, setEditingSession] = useState<EditingSession | null>(
    null
  );

  const loadEpisodeData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Parse the series slug to get show information
      const parsedSeriesSlug = parseShowSlug(series);

      // Parse the episode slug (e.g., "s01e01")
      const episodeMatch = episode.match(/^s(\d+)e(\d+)$/i);
      if (!episodeMatch) {
        setError("Invalid episode format");
        return;
      }

      const season = parseInt(episodeMatch[1]);
      const episodeNumber = parseInt(episodeMatch[2]);

      // Find the actual show in the database
      const shows = await PhraseExtractionService.getAllShows();
      const normalizedSlugName = normalizeShowName(parsedSeriesSlug.showName);

      const matchingShow = shows.find(
        (s) =>
          normalizeShowName(s.name) === normalizedSlugName ||
          normalizeShowName(s.name).includes(normalizedSlugName) ||
          normalizedSlugName.includes(normalizeShowName(s.name))
      );

      if (!matchingShow) {
        setError("Show not found");
        return;
      }

      setShow(matchingShow);

      // Find the specific episode
      const allEpisodes = await PhraseExtractionService.getEpisodesForShow(
        matchingShow.id
      );
      const targetEpisode = allEpisodes.find(
        (ep) => ep.season === season && ep.episode_number === episodeNumber
      );

      if (!targetEpisode) {
        setError(
          `Episode S${season.toString().padStart(2, "0")}E${episodeNumber
            .toString()
            .padStart(2, "0")} not found`
        );
        return;
      }

      setEpisodeData(targetEpisode);

      // Load phrases for this episode
      const episodePhrases = await PhraseExtractionService.getPhrasesForEpisode(
        targetEpisode.id
      );
      setPhrases(episodePhrases);

      // Load extractions for this episode with current phrase counts
      const { data: episodeExtractions, error: extractionsError } =
        await supabase
          .from("phrase_extractions")
          .select(
            `
          id,
          source,
          total_phrases_found,
          created_at,
          was_truncated,
          show:shows(name),
          episode:episodes(season, episode_number, title)
        `
          )
          .eq("episode_id", targetEpisode.id)
          .order("created_at", { ascending: false });

      if (extractionsError) {
        console.error("Error loading extractions:", extractionsError);
        setExtractions([]);
      } else {
        // Enhance extractions with current phrase counts
        const extractionsWithCounts = await Promise.all(
          (episodeExtractions || []).map(async (extraction) => {
            const { data: currentPhrases } = await supabase
              .from("extracted_phrases")
              .select("id")
              .eq("extraction_id", extraction.id);

            return {
              ...extraction,
              current_phrase_count: currentPhrases?.length || 0,
            };
          })
        );
        setExtractions(extractionsWithCounts);
      }
    } catch (err) {
      setError(
        `Failed to load episode data: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error loading episode data:", err);
    } finally {
      setLoading(false);
    }
  }, [series, episode]);

  useEffect(() => {
    loadEpisodeData();
  }, [loadEpisodeData]);

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
      await loadEpisodeData();
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

  const deleteEpisode = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this episode? This will delete ALL extractions and phrases for this episode and cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeleting(episodeData!.id);

      // Delete all extractions for this episode
      for (const extraction of extractions) {
        await PhraseExtractionService.deleteExtraction(extraction.id);
      }

      // Navigate back to show
      router.push(`/${generateShowSlug(show!.name)}`);
    } catch (err) {
      setError(
        `Failed to delete episode: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error deleting episode:", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleMetadataUpdate = (
    updatedShow?: Show,
    updatedEpisode?: Episode
  ) => {
    if (updatedShow) {
      setShow(updatedShow);
    }
    if (updatedEpisode) {
      setEpisodeData(updatedEpisode);
    }
    setShowMetadataEditor(false);
    // Reload data to get fresh stats
    loadEpisodeData();
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-2 mx-auto mb-4"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          ></div>
          <p style={{ color: "var(--muted)" }}>Loading episode...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <div className="text-center max-w-md">
          <div
            className="rounded-[var(--radius-lg)] p-6"
            style={{
              background: "rgba(229,9,20,.12)",
              border: "1px solid rgba(229,9,20,.25)",
            }}
          >
            <p className="mb-4" style={{ color: "var(--accent2)" }}>{error}</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 rounded-md transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#fff" }}
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
      <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
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
    <AdminRoute redirectTo="/">
      <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <div className="container mx-auto px-4 py-8">
          {/* Header with Breadcrumbs */}
          <div className="flex flex-col justify-between mb-8">
            <div className="flex flex-col gap-2">
              <Breadcrumb
                items={[
                  { label: "Shows", href: "/" },
                  {
                    label: show?.name || "",
                    href: `/${generateShowSlug(show!.name)}`,
                  },
                  {
                    label: `S${episodeData?.season
                      ?.toString()
                      .padStart(2, "0")}E${episodeData?.episode_number
                      ?.toString()
                      .padStart(2, "0")}`,
                    href: `/${generateShowSlug(
                      show!.name
                    )}/s${episodeData?.season
                      ?.toString()
                      .padStart(2, "0")}e${episodeData?.episode_number
                      ?.toString()
                      .padStart(2, "0")}`,
                  },
                  { label: "Edit", isCurrentPage: true },
                ]}
                className="mb-2"
              />

              <div>
                <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
                  Edit {show?.name}
                </h1>
                {episodeData && (
                  <p style={{ color: "var(--muted)" }}>
                    Season {episodeData.season}, Episode{" "}
                    {episodeData.episode_number}
                    {episodeData.title && ` - ${episodeData.title}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Episode Management */}
          <div
            className="rounded-[var(--radius-lg)] p-6 mb-8"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
                Episode Settings
              </h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowMetadataEditor(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Metadata</span>
                </button>
                <button
                  onClick={deleteEpisode}
                  disabled={deleting === episodeData!.id}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--accent2)" }}
                >
                  {deleting === episodeData!.id ? (
                    <div
                      className="animate-spin rounded-full h-4 w-4 border-2"
                      style={{ borderColor: "var(--accent2)", borderTopColor: "transparent" }}
                    ></div>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>Delete Episode</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div
                className="p-4 rounded-[var(--radius)]"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" style={{ color: "var(--blue)" }} />
                  <div>
                    <p className="text-lg font-bold" style={{ color: "var(--blue)" }}>
                      {phrases.length}
                    </p>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>Total Phrases</p>
                  </div>
                </div>
              </div>

              <div
                className="p-4 rounded-[var(--radius)]"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" style={{ color: "var(--green)" }} />
                  <div>
                    <p className="text-lg font-bold" style={{ color: "var(--green)" }}>
                      {extractions.length}
                    </p>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>Extractions</p>
                  </div>
                </div>
              </div>

              <div
                className="p-4 rounded-[var(--radius)]"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" style={{ color: "var(--gold)" }} />
                  <div>
                    <p className="text-lg font-bold" style={{ color: "var(--gold)" }}>
                      S{episodeData?.season?.toString().padStart(2, "0")}E
                      {episodeData?.episode_number?.toString().padStart(2, "0")}
                    </p>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>Episode</p>
                  </div>
                </div>
              </div>

              <div
                className="p-4 rounded-[var(--radius)]"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" style={{ color: "var(--amber)" }} />
                  <div>
                    <p className="text-lg font-bold" style={{ color: "var(--amber)" }}>
                      {show?.name}
                    </p>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>Show</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Extractions Management */}
          <div
            className="rounded-[var(--radius-lg)] p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
                Phrase Extractions
              </h2>
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ background: "rgba(91,140,255,.15)", color: "var(--blue)" }}
              >
                {extractions.length} extractions
              </span>
            </div>

            {extractions.length > 0 ? (
              <div className="space-y-3">
                {extractions.map((extraction) => (
                  <div
                    key={extraction.id}
                    className="rounded-[var(--radius)] p-4 flex items-center justify-between transition-colors"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5" style={{ color: "var(--faint)" }} />
                      <div>
                        <div className="font-medium" style={{ color: "var(--text)" }}>
                          {extraction.source}
                        </div>
                        <div className="text-sm" style={{ color: "var(--muted)" }}>
                          {extraction.current_phrase_count} phrases
                          {extraction.current_phrase_count !==
                            extraction.total_phrases_found && (
                            <span style={{ color: "var(--faint)" }}>
                              {" "}
                              (originally {extraction.total_phrases_found})
                            </span>
                          )}{" "}
                          • {formatDate(extraction.created_at)}
                          {extraction.was_truncated && (
                            <span
                              className="ml-2 px-2 py-1 rounded text-xs"
                              style={{ background: "rgba(245,176,65,.15)", color: "var(--amber)" }}
                            >
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
                          className="flex items-center space-x-1 px-3 py-1 rounded-md transition-opacity hover:opacity-90 text-sm"
                          style={{ background: "var(--accent)", color: "#fff" }}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Phrases</span>
                        </button>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div
                            className="text-xs px-2 py-1 rounded flex items-center space-x-1"
                            style={{ background: "rgba(229,9,20,.12)", color: "var(--accent2)" }}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>No phrases remaining</span>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => deleteExtraction(extraction.id)}
                        disabled={deleting === extraction.id}
                        className="p-1 transition-colors disabled:opacity-50 hover:opacity-80"
                        style={{ color: "var(--faint)" }}
                        title="Delete this extraction"
                      >
                        {deleting === extraction.id ? (
                          <div
                            className="animate-spin rounded-full h-4 w-4 border-2"
                            style={{ borderColor: "var(--accent2)", borderTopColor: "transparent" }}
                          ></div>
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
                <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--faint)" }} />
                <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>
                  No Extractions Found
                </h3>
                <p style={{ color: "var(--muted)" }}>
                  This episode doesn&apos;t have any phrase extractions yet.
                </p>
              </div>
            )}
          </div>

          {/* Metadata Editor Modal */}
          {show && episodeData && (
            <MetadataEditor
              extractionId="" // Not needed for episode-level editing
              currentShow={show}
              currentEpisode={episodeData}
              onUpdate={handleMetadataUpdate}
              onClose={() => setShowMetadataEditor(false)}
              isOpen={showMetadataEditor}
            />
          )}
        </div>
      </div>
    </AdminRoute>
  );
}
