import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { supabase } from '@/lib/supabase';
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
  // True once the Realtime channel is subscribed; lets us slow the backstop poll.
  const [realtimeReady, setRealtimeReady] = useState(false);

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

  // Realtime: subscribe to this user's extraction_jobs changes and refetch on any
  // event. The worker's progress writes push to the UI instantly. RLS limits the
  // stream to the user's own jobs. A ref keeps the subscription tied to the user
  // only (so it doesn't churn when refreshJobs's identity changes).
  const refreshRef = useRef(refreshJobs);
  useEffect(() => {
    refreshRef.current = refreshJobs;
  }, [refreshJobs]);

  useEffect(() => {
    // Initial state is false and the cleanup below resets it, so no setState is
    // needed here when there's no user.
    if (!user) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      // Ensure the Realtime socket carries the user's JWT. postgres_changes is
      // RLS-filtered, so without the token Realtime evaluates the policy as an
      // anonymous role and silently drops every event for the user's own rows.
      // supabase-js usually syncs this on auth changes, but doing it explicitly
      // here makes it reliable regardless of timing.
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          await supabase.realtime.setAuth(session.access_token);
        }
      } catch {
        // Subscribe anyway — the interval poll is the backstop.
      }
      if (cancelled) return;

      channel = supabase
        .channel(`extraction_jobs:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'extraction_jobs',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void refreshRef.current();
          }
        )
        .subscribe((status, err) => {
          // Diagnostic: lets us confirm Realtime on the deployed client via the
          // browser console (expect "SUBSCRIBED"; CHANNEL_ERROR/TIMED_OUT signal
          // a connection/auth problem — polling still covers the UI).
          console.log(
            `[realtime extraction_jobs] ${status}${err ? ` — ${err.message}` : ''}`
          );
          setRealtimeReady(status === 'SUBSCRIBED');
        });
    })();

    return () => {
      cancelled = true;
      setRealtimeReady(false);
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  // Poll on an interval. This refreshes active-job progress AND discovers
  // newly-created jobs, so the banner appears even if the page was idle when the
  // job started elsewhere. We must poll even with zero active jobs — otherwise an
  // idle page can only ever learn about a new job from a Realtime push, and if
  // Realtime isn't delivering (e.g. it failed to connect) the job stays invisible
  // for its whole run. With Realtime connected we poll slowly (a backstop, since
  // pushes do the fast updates); without it we poll quickly so the UI still works.
  useEffect(() => {
    const intervalMs = realtimeReady ? 15000 : 5000;
    const interval = setInterval(() => {
      void refreshJobs();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [realtimeReady, refreshJobs]);

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
    if (!job || !['queued', 'pending', 'running'].includes(job.status)) return;

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
