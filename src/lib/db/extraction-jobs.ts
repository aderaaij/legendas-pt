import { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase-client";
import { ExtractionJob } from "@/types/database";

export async function createExtractionJob(
  userId: string,
  jobType: "rtp_series" | "manual_upload",
  seriesTitle?: string,
  seriesUrl?: string,
  totalEpisodes: number = 0,
  authenticatedSupabase?: SupabaseClient
): Promise<ExtractionJob> {
  const client = authenticatedSupabase || supabase;
  const { data, error } = await client
    .from("extraction_jobs")
    .insert({
      user_id: userId,
      job_type: jobType,
      status: "pending",
      progress: 0,
      total_episodes: totalEpisodes,
      completed_episodes: 0,
      failed_episodes: 0,
      series_title: seriesTitle,
      series_url: seriesUrl,
    })
    .select()
    .single();

  if (error) {
    console.error("Database error creating extraction job:", error);
    throw new Error(
      `Failed to create extraction job: ${
        error.message || "Database table may not exist"
      }`
    );
  }

  return data;
}

export async function updateExtractionJob(
  jobId: string,
  updates: Partial<
    Pick<
      ExtractionJob,
      | "status"
      | "progress"
      | "completed_episodes"
      | "failed_episodes"
      | "current_episode"
      | "error_message"
      | "results"
      | "completed_at"
    >
  >,
  authenticatedSupabase?: SupabaseClient
): Promise<ExtractionJob> {
  const client = authenticatedSupabase || supabase;
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("extraction_jobs")
    .update(updateData)
    .eq("id", jobId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update extraction job: ${error.message}`);
  }

  return data;
}

export async function getExtractionJob(
  jobId: string,
  authenticatedSupabase?: SupabaseClient
): Promise<ExtractionJob | null> {
  const client = authenticatedSupabase || supabase;
  const { data, error } = await client
    .from("extraction_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Job not found
    }
    throw new Error(`Failed to get extraction job: ${error.message}`);
  }

  return data;
}

export async function getUserExtractionJobs(
  userId: string,
  limit: number = 10
): Promise<ExtractionJob[]> {
  const { data, error } = await supabase
    .from("extraction_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get user extraction jobs: ${error.message}`);
  }

  return data || [];
}

export async function getActiveExtractionJobs(
  userId: string
): Promise<ExtractionJob[]> {
  const { data, error } = await supabase
    .from("extraction_jobs")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get active extraction jobs: ${error.message}`);
  }

  return data || [];
}

export async function cancelExtractionJob(
  jobId: string
): Promise<ExtractionJob> {
  return updateExtractionJob(jobId, {
    status: "cancelled",
    completed_at: new Date().toISOString(),
  });
}
