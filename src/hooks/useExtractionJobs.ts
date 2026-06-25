import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import type { ExtractionJob } from '@/lib/supabase';

interface UseExtractionJobsReturn {
  activeJobs: ExtractionJob[];
  allJobs: ExtractionJob[];
  loading: boolean;
  error: string | null;
  refreshJobs: () => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  getJob: (jobId: string) => Promise<ExtractionJob | null>;
}

export function useExtractionJobs(): UseExtractionJobsReturn {
  const { user } = useAuth();
  const authedFetch = useAuthedFetch();
  const [activeJobs, setActiveJobs] = useState<ExtractionJob[]>([]);
  const [allJobs, setAllJobs] = useState<ExtractionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshJobs = useCallback(async () => {
    // Don't try to fetch jobs if user is not authenticated
    if (!user) {
      setActiveJobs([]);
      setAllJobs([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch active jobs
      const activeResponse = await authedFetch('/api/extraction-jobs?activeOnly=true');

      if (!activeResponse.ok) {
        throw new Error('Failed to fetch active jobs');
      }

      const activeData = await activeResponse.json();
      setActiveJobs(activeData.jobs || []);

      // Fetch all jobs
      const allResponse = await authedFetch('/api/extraction-jobs');

      if (!allResponse.ok) {
        throw new Error('Failed to fetch all jobs');
      }

      const allData = await allResponse.json();
      setAllJobs(allData.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [authedFetch, user]);

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const response = await authedFetch('/api/extraction-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel',
          jobId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel job');
      }

      // Refresh jobs after cancellation
      await refreshJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
      throw err;
    }
  }, [authedFetch, refreshJobs]);

  const getJob = useCallback(async (jobId: string): Promise<ExtractionJob | null> => {
    try {
      const response = await authedFetch(`/api/extraction-jobs?jobId=${jobId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch job');
      }

      const data = await response.json();
      return data.job;
    } catch (err) {
      console.error('Error fetching job:', err);
      return null;
    }
  }, [authedFetch]);

  // Auto-refresh active jobs every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeJobs.length > 0) {
        refreshJobs();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeJobs.length, refreshJobs]);

  // Initial load
  useEffect(() => {
    (async () => {
      await refreshJobs();
    })();
  }, [refreshJobs]);

  return {
    activeJobs,
    allJobs,
    loading,
    error,
    refreshJobs,
    cancelJob,
    getJob,
  };
}

export function useExtractionJob(jobId: string | null) {
  const { user } = useAuth();
  const authedFetch = useAuthedFetch();
  const [job, setJob] = useState<ExtractionJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshJob = useCallback(async () => {
    if (!jobId || !user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await authedFetch(`/api/extraction-jobs?jobId=${jobId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setJob(null);
          return;
        }
        throw new Error('Failed to fetch job');
      }

      const data = await response.json();
      setJob(data.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job');
    } finally {
      setLoading(false);
    }
  }, [jobId, authedFetch, user]);

  // Auto-refresh if job is active
  useEffect(() => {
    if (!job || !['pending', 'running'].includes(job.status)) return;

    const interval = setInterval(refreshJob, 3000);
    return () => clearInterval(interval);
  }, [job, refreshJob]);

  // Initial load
  useEffect(() => {
    (async () => {
      await refreshJob();
    })();
  }, [refreshJob]);

  return {
    job,
    loading,
    error,
    refreshJob,
  };
}
