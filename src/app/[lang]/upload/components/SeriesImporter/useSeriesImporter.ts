import { useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import { useExtractionJob } from "@/hooks/useExtractionJobs";
import { Show } from "@/lib/supabase";
import { SERIES_SOURCES, sourceIdForUrl } from "@/lib/sources/meta";
import { generateShowSlug } from "@/utils/slugify";
import type {
  SeriesPreviewResponse,
  SourceSeries,
} from "@/types/series-source";
import { ACTIVE_JOB_STATUSES } from "./importStatus";

const EXAMPLE_URLS = Object.values(SERIES_SOURCES)
  .map((s) => s.exampleUrl)
  .join(" or ");

export type ShowMappingStep = "none" | "mapping" | "creating";

/**
 * Drives the series import flow (RTP Play or RTVE Play, recognised from the
 * URL): previewing a series (and switching season, for RTVE), selecting
 * episodes, mapping/creating a target show, and kicking off background
 * processing (with job tracking).
 */
export function useSeriesImporter() {
  const { user, isAdmin } = useAuth();
  const authedFetch = useAuthedFetch();

  const [seriesUrl, setSeriesUrl] = useState("");
  const [isScrapingPreview, setIsScrapingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const [forceReExtraction, setForceReExtraction] = useState(false);
  const [seriesPreview, setSeriesPreview] = useState<SourceSeries | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(
    new Set()
  );

  // Show mapping flow
  const [showMappingStep, setShowMappingStep] =
    useState<ShowMappingStep>("none");
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);

  // The import started from this page, polled while it's queued/running.
  const { job: currentJob, cancelJob: cancelImport } =
    useExtractionJob(currentJobId);
  // Busy from the click until the job finishes — including the moment between
  // enqueueing and the job's first fetch — so it can't be started twice.
  const importActive =
    currentJobId !== null &&
    (!currentJob || ACTIVE_JOB_STATUSES.has(currentJob.status));
  const isBusy = isProcessing || importActive;

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

  const fetchPreview = async (seasonId: string | null) => {
    setIsScrapingPreview(true);
    setError(null);
    setSeriesPreview(null);

    try {
      const response = await authedFetch("/api/series-import/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: seriesUrl, seasonId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to preview series");
      }

      const data: SeriesPreviewResponse = await response.json();

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

  const handlePreview = async () => {
    if (!seriesUrl.trim()) {
      setError("Please enter a series URL");
      return;
    }

    if (!user) {
      setError("Please log in to preview series");
      return;
    }

    if (!sourceIdForUrl(seriesUrl)) {
      setError(
        `Unsupported series URL. Please provide a series URL like: ${EXAMPLE_URLS}`
      );
      return;
    }

    // A new series: forget the show and import of the previous one.
    setSelectedShow(null);
    setCurrentJobId(null);
    await fetchPreview(null);
  };

  /** List another season of the same program (RTVE). */
  const handleSeasonChange = async (seasonId: string) => {
    setCurrentJobId(null);
    await fetchPreview(seasonId);
  };

  const handleProcess = async () => {
    if (isBusy) return;

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

    // Enqueue the import and return. The persistent worker claims the job and
    // runs the per-episode loop in the background; progress is shown by the
    // JobStatusBanner + the series-page panel (both poll the job row).
    setIsProcessing(true);
    setError(null);

    try {
      const res = await authedFetch("/api/series-import/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: seriesUrl,
          seasonId: seriesPreview.seasonId ?? null,
          selectedEpisodes: Array.from(selectedEpisodes),
          selectedShowId: selectedShow.id,
          saveToDatabase,
          forceReExtraction,
          season: seriesPreview.season,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to start import");
      }
      const { jobId } = await res.json();
      setCurrentJobId(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start import");
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

  return {
    user,
    isAdmin,
    seriesUrl,
    setSeriesUrl,
    isScrapingPreview,
    isBusy,
    currentJobId,
    currentJob,
    cancelImport,
    showHref: selectedShow ? `/${generateShowSlug(selectedShow.name)}` : null,
    saveToDatabase,
    setSaveToDatabase,
    forceReExtraction,
    setForceReExtraction,
    seriesPreview,
    error,
    selectedEpisodes,
    toggleEpisodeSelection,
    selectAllEpisodes,
    deselectAllEpisodes,
    showMappingStep,
    selectedShow,
    setSelectedShow,
    handlePreview,
    handleSeasonChange,
    handleProcess,
    handleShowSelected,
    handleShowCreated,
    handleCancelMapping,
    handleCreateNewShow,
  };
}
