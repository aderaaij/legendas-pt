"use client";

/**
 * Drives a chunked RTP import from the client. Mounted in the root layout (above
 * the router), so the driving loop survives in-app navigation — start an import
 * on /upload, browse to the series page, and it keeps stepping. On mount it also
 * resumes any in-flight import (e.g. after a reload). Progress itself is read by
 * the UI via polling the job row, not from this context.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";

export interface StartImportParams {
  rtpUrl: string;
  selectedEpisodes: number[];
  selectedShowId: string;
  saveToDatabase: boolean;
  forceReExtraction: boolean;
  season?: number;
  provider?: string;
  model?: string;
}

interface RTPImportContextValue {
  activeJobId: string | null;
  isDriving: boolean;
  lastError: string | null;
  startImport: (params: StartImportParams) => Promise<string>;
}

const RTPImportContext = createContext<RTPImportContextValue | undefined>(
  undefined
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_STEP_RETRIES = 3;

export function RTPImportProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const authedFetch = useAuthedFetch();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isDriving, setIsDriving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  // The job currently being driven; guards against two drive loops at once.
  const drivingRef = useRef<string | null>(null);

  const drive = useCallback(
    async (jobId: string) => {
      if (drivingRef.current) return; // a loop is already running
      drivingRef.current = jobId;
      setActiveJobId(jobId);
      setIsDriving(true);
      setLastError(null);

      try {
        let errors = 0;
        while (drivingRef.current === jobId) {
          let res: Response | null = null;
          try {
            res = await authedFetch("/api/rtp-import/step", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobId }),
            });
          } catch (err) {
            errors++;
            if (errors > MAX_STEP_RETRIES) {
              setLastError(err instanceof Error ? err.message : "Network error");
              break;
            }
            await sleep(2000 * errors);
            continue;
          }

          if (!res.ok) {
            errors++;
            if (errors > MAX_STEP_RETRIES) {
              let msg = `Import step failed (${res.status})`;
              try {
                const d = await res.json();
                msg = d.error || msg;
              } catch {
                // ignore
              }
              setLastError(msg);
              break;
            }
            await sleep(2000 * errors);
            continue;
          }

          errors = 0;
          const data = await res.json();
          if (data.done || data.cancelled) break;
          await sleep(500); // gentle pacing between episodes
        }
      } finally {
        if (drivingRef.current === jobId) drivingRef.current = null;
        setIsDriving(false);
        setActiveJobId((prev) => (prev === jobId ? null : prev));
      }
    },
    [authedFetch]
  );

  const startImport = useCallback(
    async (params: StartImportParams): Promise<string> => {
      const res = await authedFetch("/api/rtp-import/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to start import");
      }
      const { jobId } = await res.json();
      void drive(jobId);
      return jobId;
    },
    [authedFetch, drive]
  );

  // Resume an in-flight import once per signed-in session (e.g. after reload, or
  // if the import was started in another tab that has since closed).
  const resumeCheckedRef = useRef(false);
  useEffect(() => {
    if (!user) {
      resumeCheckedRef.current = false;
      return;
    }
    if (resumeCheckedRef.current) return;
    resumeCheckedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch("/api/extraction-jobs?activeOnly=true");
        if (!res.ok || cancelled) return;
        const { jobs } = await res.json();
        const active = (
          jobs as Array<{ id: string; job_type: string; status: string }>
        )?.find(
          (j) =>
            j.job_type === "rtp_series" &&
            ["pending", "running"].includes(j.status)
        );
        if (active && !drivingRef.current) {
          void drive(active.id);
        }
      } catch {
        // best-effort resume
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authedFetch, drive]);

  return (
    <RTPImportContext.Provider
      value={{ activeJobId, isDriving, lastError, startImport }}
    >
      {children}
    </RTPImportContext.Provider>
  );
}

export function useRTPImport(): RTPImportContextValue {
  const ctx = useContext(RTPImportContext);
  if (!ctx) {
    throw new Error("useRTPImport must be used within RTPImportProvider");
  }
  return ctx;
}
