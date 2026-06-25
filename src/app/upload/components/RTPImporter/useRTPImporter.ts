import { useState } from "react";

import RTPScraperService from "@/lib/rtp-scraper";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import { useExtractionJob } from "@/hooks/useExtractionJobs";
import { Show } from "@/lib/supabase";
import type { RTPSeries, RTPPreviewResponse } from "@/types/rtp";

export interface ScrapingResult {
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

export interface ScrapingSummary {
  total: number;
  successful: number;
  failed: number;
  alreadyExists: number;
  noSubtitle: number;
}

export type ShowMappingStep = "none" | "mapping" | "creating";

/**
 * Drives the RTP series import flow: previewing a series, selecting episodes,
 * mapping/creating a target show, and kicking off background processing (with
 * job tracking).
 */
export function useRTPImporter() {
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

  // Show mapping flow
  const [showMappingStep, setShowMappingStep] =
    useState<ShowMappingStep>("none");
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

  return {
    user,
    isAdmin,
    rtpUrl,
    setRtpUrl,
    isScrapingPreview,
    isProcessing,
    saveToDatabase,
    setSaveToDatabase,
    forceReExtraction,
    setForceReExtraction,
    seriesPreview,
    results,
    summary,
    error,
    selectedEpisodes,
    toggleEpisodeSelection,
    selectAllEpisodes,
    deselectAllEpisodes,
    showMappingStep,
    selectedShow,
    setSelectedShow,
    handlePreview,
    handleProcess,
    handleShowSelected,
    handleShowCreated,
    handleCancelMapping,
    handleCreateNewShow,
  };
}
