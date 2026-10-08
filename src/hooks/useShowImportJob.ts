import { useExtractionJobs } from "@/hooks/useExtractionJobs";
import type { ExtractionJob } from "@/lib/supabase";
import type { ImportPlan } from "@/lib/series-import/types";

/**
 * Returns the active series import job (RTP/RTVE; job_type 'rtp_series') whose
 * plan targets `showId`, by reusing the polling `useExtractionJobs` hook. Only
 * the admin who started the import sees it (jobs are scoped per user), which is
 * the intended behaviour on the otherwise-public series page.
 */
export function useShowImportJob(showId: string): {
  job: ExtractionJob | null;
  cancelJob: (jobId: string) => Promise<void>;
} {
  const { activeJobs, cancelJob } = useExtractionJobs();

  const job =
    activeJobs.find((j) => {
      const plan = (j.results as { plan?: ImportPlan } | undefined)?.plan;
      return (
        j.job_type === "rtp_series" &&
        plan?.showId === showId &&
        ["queued", "pending", "running"].includes(j.status)
      );
    }) ?? null;

  return { job, cancelJob };
}
