import { useState, useCallback } from "react";

import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import { parseShowInfo } from "@/utils/extractPhrasesUtils";
import { ExtractionSettings } from "@/app/upload/components/PhraseExtractor";
import { SubtitleMetadata } from "@/app/upload/page";

interface UsePhraseExtractionProps {
  settings: ExtractionSettings;
  fileName?: string;
  metadata: SubtitleMetadata | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TERMINAL = ["completed", "failed", "cancelled"];
const POLL_MS = 2500;
const MAX_WAIT_MS = 10 * 60 * 1000; // give the worker plenty of time

/**
 * Manual upload as a worker job: enqueue the subtitle content to the control
 * plane, then poll the job until the worker finishes. The LLM work happens on
 * the worker — no extraction runs in the browser or on Vercel anymore.
 */
export const usePhraseExtraction = ({
  settings,
  fileName,
  metadata,
}: UsePhraseExtractionProps) => {
  const authedFetch = useAuthedFetch();
  const [isExtracting, setIsExtracting] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);

  const handleExtraction = useCallback(
    async (subtitleContent: string, onComplete: () => void) => {
      if (!subtitleContent) return;

      setIsExtracting(true);
      setStatusLabel("Queued…");
      try {
        const { showName, season, episodeNumber } =
          metadata || parseShowInfo(fileName);

        // 1. Enqueue the manual_upload job.
        const res = await authedFetch("/api/manual-upload/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: subtitleContent,
            filename: fileName,
            showName,
            source: metadata?.source || "uploaded_file",
            season,
            episodeNumber,
            provider: settings.provider,
            model: settings.model,
            forceReExtraction: settings.forceReExtraction,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Failed to start extraction");
        }
        const { jobId } = await res.json();

        // 2. Poll the job until the worker reaches a terminal state.
        const startedAt = Date.now();
        for (;;) {
          await sleep(POLL_MS);
          const jr = await authedFetch(`/api/extraction-jobs?jobId=${jobId}`);
          if (jr.ok) {
            const { job } = await jr.json();
            if (job) {
              if (job.current_episode) setStatusLabel(job.current_episode);
              if (TERMINAL.includes(job.status)) {
                if (job.status === "completed") {
                  onComplete();
                  return;
                }
                throw new Error(job.error_message || `Extraction ${job.status}`);
              }
            }
          }
          if (Date.now() - startedAt > MAX_WAIT_MS) {
            throw new Error(
              "Still processing on the worker — check progress on the series page."
            );
          }
        }
      } finally {
        setIsExtracting(false);
        setStatusLabel(null);
      }
    },
    [authedFetch, settings, fileName, metadata]
  );

  return {
    isExtracting,
    statusLabel,
    handleExtraction,
  };
};
