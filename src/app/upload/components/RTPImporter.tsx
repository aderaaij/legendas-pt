"use client";

import { useState } from "react";
import RTPScraperService from "@/lib/rtp-scraper";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import { useExtractionJob } from "@/hooks/useExtractionJobs";
import JobStatusBanner from "@/app/components/JobStatusBanner";
import ShowMapper from "./ShowMapper";
import ShowTVDBCreator from "./ShowTVDBCreator";
import { Show } from "@/lib/supabase";
import { decodeHtmlEntities } from "@/utils/htmlUtils";
import type { RTPSeries, RTPPreviewResponse } from "@/types/rtp";

interface ScrapingResult {
  episode: number;
  title: string;
  status:
    | "success"
    | "error"
    | "extraction_failed"
    | "already_exists"
    | "no_subtitle";
  extractionId?: number;
  phraseCount?: number;
  error?: string;
  message?: string;
}

interface ScrapingSummary {
  total: number;
  successful: number;
  failed: number;
  alreadyExists: number;
  noSubtitle: number;
}

export default function RTPImporter() {
  const { user, isAdmin } = useAuth();
  const authedFetch = useAuthedFetch();
  const [rtpUrl, setRtpUrl] = useState("");
  const [isScrapingPreview, setIsScrapingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const [forceReExtraction, setForceReExtraction] = useState(false);
  const [seriesPreview, setSeriesPreview] = useState<RTPSeries | null>(null);
  const [results, setResults] = useState<ScrapingResult[]>([]);
  const [summary, setSummary] = useState<ScrapingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(
    new Set()
  );

  // New state for show mapping flow
  const [showMappingStep, setShowMappingStep] = useState<
    "none" | "mapping" | "creating"
  >("none");
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);

  useExtractionJob(currentJobId);

  const toggleEpisodeSelection = (episodeNumber: number) => {
    const newSelected = new Set(selectedEpisodes);
    if (newSelected.has(episodeNumber)) {
      newSelected.delete(episodeNumber);
    } else {
      newSelected.add(episodeNumber);
    }
    setSelectedEpisodes(newSelected);
  };

  const selectAllEpisodes = () => {
    if (seriesPreview?.episodes) {
      const allEpisodes = new Set<number>(
        seriesPreview.episodes.map((ep) => ep.episodeNumber)
      );
      setSelectedEpisodes(allEpisodes);
    }
  };

  const deselectAllEpisodes = () => {
    setSelectedEpisodes(new Set());
  };

  const handlePreview = async () => {
    if (!rtpUrl.trim()) {
      setError("Please enter an RTP series URL");
      return;
    }

    if (!user) {
      setError("Please log in to preview series");
      return;
    }

    const urlValidation = RTPScraperService.parseRTPUrl(rtpUrl);
    if (!urlValidation.isValid) {
      setError(
        "Invalid RTP URL format. Please provide a series URL like: https://www.rtp.pt/play/p14147/o-americano"
      );
      return;
    }

    setIsScrapingPreview(true);
    setError(null);
    setSeriesPreview(null);

    try {
      const response = await authedFetch("/api/preview-rtp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rtpUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to preview series");
      }

      const data: RTPPreviewResponse = await response.json();

      setSeriesPreview(data.series);

      // Auto-select all episodes by default
      if (data.series?.episodes) {
        const allEpisodes = new Set<number>(
          data.series.episodes.map((ep) => ep.episodeNumber)
        );
        setSelectedEpisodes(allEpisodes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview series");
    } finally {
      setIsScrapingPreview(false);
    }
  };

  const handleProcess = async () => {
    if (!seriesPreview) {
      setError("Please preview the series first");
      return;
    }

    if (!user) {
      setError("Please log in to process episodes");
      return;
    }

    if (selectedEpisodes.size === 0) {
      setError("Please select at least one episode to process");
      return;
    }

    // If no show is selected yet, start the mapping flow
    if (!selectedShow) {
      setShowMappingStep("mapping");
      return;
    }

    // Proceed with processing
    setIsProcessing(true);
    setError(null);
    setResults([]);
    setSummary(null);

    try {
      const response = await authedFetch("/api/scrape-rtp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rtpUrl,
          saveToDatabase,
          forceReExtraction,
          selectedEpisodes: Array.from(selectedEpisodes),
          selectedShowId: selectedShow?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process series");
      }

      const data = await response.json();
      setResults(data.results);
      setSummary(data.summary);

      // Set the job ID for tracking
      if (data.jobId) {
        setCurrentJobId(data.jobId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process series");
      // If we got a job ID even on error, track it
      if (err instanceof Error && err.message.includes("jobId:")) {
        const jobIdMatch = err.message.match(/jobId: (\w+)/);
        if (jobIdMatch) {
          setCurrentJobId(jobIdMatch[1]);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShowSelected = (show: Show) => {
    setSelectedShow(show);
    setShowMappingStep("none");
  };

  const handleShowCreated = (show: Show) => {
    setSelectedShow(show);
    setShowMappingStep("none");
  };

  const handleCancelMapping = () => {
    setShowMappingStep("none");
  };

  const handleCreateNewShow = () => {
    setShowMappingStep("creating");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "var(--green)";
      case "already_exists":
        return "var(--blue)";
      case "no_subtitle":
        return "var(--gold)";
      case "error":
      case "extraction_failed":
        return "var(--accent2)";
      default:
        return "var(--muted)";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "success":
        return "Success";
      case "already_exists":
        return "Already Exists";
      case "no_subtitle":
        return "No Subtitle";
      case "extraction_failed":
        return "Extraction Failed";
      case "error":
        return "Error";
      default:
        return status;
    }
  };

  // Show authentication message if not logged in or not admin
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div
          className="rounded-lg p-6 text-center"
          style={{
            background: "rgba(247,181,0,.1)",
            border: "1px solid rgba(247,181,0,.25)",
          }}
        >
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--gold)" }}>
            Authentication Required
          </h3>
          <p style={{ color: "var(--muted)" }}>
            Please log in to use the RTP Series Importer.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div
          className="rounded-lg p-6 text-center"
          style={{
            background: "rgba(229,9,20,.1)",
            border: "1px solid rgba(229,9,20,.25)",
          }}
        >
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--accent2)" }}>
            Admin Access Required
          </h3>
          <p style={{ color: "var(--muted)" }}>
            Only administrators can use the RTP Series Importer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <JobStatusBanner />

      <div
        className="rounded-lg p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-2xl font-bold mb-4">RTP Series Importer</h2>
        <p className="mb-6" style={{ color: "var(--muted)" }}>
          Import Portuguese subtitles and extract phrases from RTP Play series.
          Provide a series URL to automatically process all episodes.
        </p>

        <div
          className="rounded-lg p-4 mb-6"
          style={{
            background: "rgba(91,140,255,.08)",
            border: "1px solid rgba(91,140,255,.25)",
          }}
        >
          <h3 className="font-medium mb-2" style={{ color: "var(--blue)" }}>
            Background Processing
          </h3>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Extraction jobs run in the background - you can safely navigate away
            from this page while processing continues. Use the job status panel
            above to track progress and return to check results later.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="rtp-url"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text)" }}
            >
              RTP Series URL
            </label>
            <input
              id="rtp-url"
              type="url"
              value={rtpUrl}
              onChange={(e) => setRtpUrl(e.target.value)}
              placeholder="https://www.rtp.pt/play/p14147/o-americano"
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
              disabled={isScrapingPreview || isProcessing}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handlePreview}
              disabled={isScrapingPreview || isProcessing}
              className="px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {isScrapingPreview ? "Loading Preview..." : "Preview Series"}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="mt-4 p-4 rounded-md"
            style={{
              background: "rgba(229,9,20,.1)",
              border: "1px solid rgba(229,9,20,.35)",
              color: "var(--accent2)",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {seriesPreview && (
        <div
          className="rounded-lg p-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-xl font-semibold mb-4">Series Preview</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <p>
                <strong>Title:</strong>{" "}
                {decodeHtmlEntities(seriesPreview.title)}
              </p>
              <p>
                <strong>Episodes Found:</strong> {seriesPreview.episodes.length}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Episodes to Process:</h4>
              <div className="flex gap-2">
                <button
                  onClick={selectAllEpisodes}
                  className="px-3 py-1 text-sm rounded transition-colors"
                  style={{ background: "rgba(91,140,255,.15)", color: "var(--blue)" }}
                  disabled={isProcessing}
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllEpisodes}
                  className="px-3 py-1 text-sm rounded transition-colors"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border2)",
                    color: "var(--text)",
                  }}
                  disabled={isProcessing}
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="text-sm mb-2" style={{ color: "var(--muted)" }}>
              {selectedEpisodes.size} of {seriesPreview.episodes.length}{" "}
              episodes selected
            </div>
            <div
              className="max-h-48 overflow-y-auto rounded-md"
              style={{ border: "1px solid var(--border)" }}
            >
              {seriesPreview.episodes.map((episode) => (
                <label
                  key={episode.id}
                  className="flex items-center p-3 last:border-b-0 cursor-pointer transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedEpisodes.has(episode.episodeNumber)}
                    onChange={() =>
                      toggleEpisodeSelection(episode.episodeNumber)
                    }
                    className="mr-3 rounded"
                    style={{ accentColor: "var(--accent)" }}
                    disabled={isProcessing}
                  />
                  <div className="flex justify-between items-start flex-1">
                    <div>
                      <span className="font-medium">
                        Ep. {episode.episodeNumber}
                      </span>
                      <span className="ml-2" style={{ color: "var(--muted)" }}>
                        {episode.title}
                      </span>
                    </div>
                    <span className="text-sm" style={{ color: "var(--faint)" }}>
                      {episode.airDate}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {/* Show Selection Status */}
            {selectedShow && (
              <div
                className="rounded-lg p-4"
                style={{
                  background: "rgba(61,220,132,.1)",
                  border: "1px solid rgba(61,220,132,.25)",
                }}
              >
                <h4 className="font-medium mb-2" style={{ color: "var(--green)" }}>
                  Show Selected
                </h4>
                <p style={{ color: "var(--text)" }}>
                  Episodes will be mapped to:{" "}
                  <span className="font-medium">{selectedShow.name}</span>
                </p>
                <button
                  onClick={() => setSelectedShow(null)}
                  className="mt-2 text-sm underline transition-colors hover:opacity-80"
                  style={{ color: "var(--green)" }}
                  disabled={isProcessing}
                >
                  Change show selection
                </button>
              </div>
            )}

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={saveToDatabase}
                  onChange={(e) => setSaveToDatabase(e.target.checked)}
                  className="mr-2"
                  style={{ accentColor: "var(--accent)" }}
                  disabled={isProcessing}
                />
                Save to database
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forceReExtraction}
                  onChange={(e) => setForceReExtraction(e.target.checked)}
                  className="mr-2"
                  style={{ accentColor: "var(--accent)" }}
                  disabled={isProcessing}
                />
                Force re-extraction (even if content exists)
              </label>
            </div>

            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="px-6 py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ background: "var(--green)", color: "#04210f" }}
            >
              {isProcessing
                ? "Processing Episodes..."
                : selectedShow
                ? "Process All Episodes"
                : "Select Show & Process Episodes"}
            </button>
          </div>
        </div>
      )}

      {(results.length > 0 || summary) && (
        <div
          className="rounded-lg p-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-xl font-semibold mb-4">Processing Results</h3>

          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                  {summary.total}
                </div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--green)" }}>
                  {summary.successful}
                </div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--blue)" }}>
                  {summary.alreadyExists}
                </div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>Existing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--gold)" }}>
                  {summary.noSubtitle}
                </div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>No Subtitle</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--accent2)" }}>
                  {summary.failed}
                </div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>Failed</div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 rounded-md"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
              >
                <div>
                  <span className="font-medium">Ep. {result.episode}</span>
                  <span className="ml-2" style={{ color: "var(--muted)" }}>{result.title}</span>
                  {result.phraseCount && (
                    <span className="ml-2 text-sm" style={{ color: "var(--green)" }}>
                      ({result.phraseCount} phrases)
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className="font-medium"
                    style={{ color: getStatusColor(result.status) }}
                  >
                    {getStatusText(result.status)}
                  </span>
                  {result.error && (
                    <div className="text-sm mt-1" style={{ color: "var(--accent2)" }}>
                      {result.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isProcessing && (
        <div
          className="rounded-lg p-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-center space-x-2">
            <div
              className="animate-spin rounded-full h-6 w-6 border-b-2"
              style={{ borderColor: "var(--accent)", borderBottomColor: "var(--accent)" }}
            ></div>
            <span>Processing episodes... This may take several minutes.</span>
          </div>
        </div>
      )}

      {/* Show Mapping Modal */}
      <ShowMapper
        isOpen={showMappingStep === "mapping"}
        seriesTitle={seriesPreview?.title || ""}
        episodes={seriesPreview?.episodes || []}
        onShowSelected={handleShowSelected}
        onCreateNewShow={handleCreateNewShow}
        onCancel={handleCancelMapping}
      />

      {/* Show TVDB Creator Modal */}
      <ShowTVDBCreator
        isOpen={showMappingStep === "creating"}
        seriesTitle={seriesPreview?.title || ""}
        episodes={seriesPreview?.episodes || []}
        onShowCreated={handleShowCreated}
        onCancel={handleCancelMapping}
      />
    </div>
  );
}
