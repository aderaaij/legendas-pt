// Translation review persistence (database/phrase_review.sql).
//
// Framework-free like the other db modules, and free of runtime imports from
// `@/lib/llm`: the episode edit page reads suggestions in the Next bundle, the
// worker writes them with its service-role client. Accepting or rejecting a
// suggestion is a plain `updatePhrase` (lib/db/phrases.ts).
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase-client";
import { toTargetLanguage, type TargetLanguage } from "@/lib/i18n/languages";
import type { ExtractedPhrase, ReviewStatus } from "@/types/database";

/** The episode embedded on an extraction row, for labels. */
export type EpisodeEmbed = {
  season: number | null;
  episode_number: number | null;
  show: { name: string } | null;
} | null;

/** PostgREST embed that yields an `EpisodeEmbed` named `episode`. */
export const EPISODE_EMBED = "episode:episodes(season, episode_number, show:shows(name))";

/** "Show S01E02" for job titles and progress. */
export function episodeLabel(episode: EpisodeEmbed): string {
  const pad = (n: number | null) => String(n ?? 0).padStart(2, "0");
  return episode
    ? `${episode.show?.name ?? "Unknown show"} S${pad(episode.season)}E${pad(episode.episode_number)}`
    : "Unknown episode";
}

export interface ReviewSource {
  label: string;
  language: TargetLanguage;
  /** The stored subtitle; null when the extraction predates storing it. */
  content: string | null;
  filename?: string;
}

/** What the worker needs to review an extraction; null if it no longer exists. */
export async function getReviewSource(
  client: SupabaseClient,
  extractionId: string
): Promise<ReviewSource | null> {
  const { data, error } = await client
    .from("phrase_extractions")
    .select(`language, content_full, extraction_params, ${EPISODE_EMBED}`)
    .eq("id", extractionId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load extraction: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as {
    language: string | null;
    content_full: string | null;
    extraction_params: { filename?: unknown } | null;
    episode: EpisodeEmbed;
  };
  const filename = row.extraction_params?.filename;
  return {
    label: episodeLabel(row.episode),
    language: toTargetLanguage(row.language),
    content: row.content_full,
    filename: typeof filename === "string" ? filename : undefined,
  };
}

/** A phrase as the reviewer sees it, plus any earlier admin decision. */
export interface PhraseToReview {
  id: string;
  phrase: string;
  translation: string;
  review_status: ReviewStatus | null;
}

/** An extraction's phrases in subtitle order. */
export async function getPhrasesToReview(
  client: SupabaseClient,
  extractionId: string
): Promise<PhraseToReview[]> {
  const { data, error } = await client
    .from("extracted_phrases")
    .select("id, phrase, translation, review_status")
    .eq("extraction_id", extractionId)
    .order("position_in_content", { ascending: true });
  if (error) throw new Error(`Failed to load phrases for review: ${error.message}`);
  return data ?? [];
}

export interface SaveReviewInput {
  extractionId: string;
  /** Suggestions for undecided phrases only — the caller skips decided ones. */
  flags: { phraseId: string; translation: string; issue: string }[];
  /** Provenance, stored on the extraction (provider, model, prompt version). */
  params: Record<string, unknown>;
}

/**
 * Store a review's suggestions as `pending`, replacing any still-pending ones
 * from an earlier review (accepted/rejected phrases keep their decision), and
 * mark the extraction reviewed. Returns how many suggestions are pending.
 */
export async function saveReviewFlags(
  client: SupabaseClient,
  { extractionId, flags, params }: SaveReviewInput
): Promise<number> {
  const { error: clearError } = await client
    .from("extracted_phrases")
    .update({ review_translation: null, review_issue: null, review_status: null })
    .eq("extraction_id", extractionId)
    .eq("review_status", "pending");
  if (clearError) throw new Error(`Failed to clear old suggestions: ${clearError.message}`);

  const results = await Promise.all(
    flags.map((flag) =>
      client
        .from("extracted_phrases")
        .update({
          review_translation: flag.translation,
          review_issue: flag.issue,
          review_status: "pending",
        })
        .eq("id", flag.phraseId)
    )
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(`Failed to save suggestions: ${failed.error.message}`);

  const { error: markError } = await client
    .from("phrase_extractions")
    .update({ reviewed_at: new Date().toISOString(), review_params: params })
    .eq("id", extractionId);
  if (markError) throw new Error(`Failed to mark extraction reviewed: ${markError.message}`);

  return flags.length;
}

export type ReviewedPhrase = Pick<
  ExtractedPhrase,
  "id" | "phrase" | "translation" | "review_translation" | "review_issue" | "review_status"
>;

export interface EpisodeReview {
  /** Latest review of any of the episode's extractions; null = never reviewed. */
  reviewedAt: string | null;
  /** Every phrase the reviewer flagged, in subtitle order. */
  phrases: ReviewedPhrase[];
}

/** An episode's translation-review suggestions, for the admin edit page. */
export async function getEpisodeReview(episodeId: string): Promise<EpisodeReview> {
  const { data: extractions, error: extractionsError } = await supabase
    .from("phrase_extractions")
    .select("id, reviewed_at")
    .eq("episode_id", episodeId);
  if (extractionsError) throw new Error(extractionsError.message);
  if (!extractions?.length) return { reviewedAt: null, phrases: [] };

  const { data, error } = await supabase
    .from("extracted_phrases")
    .select("id, phrase, translation, review_translation, review_issue, review_status")
    .in(
      "extraction_id",
      extractions.map((extraction) => extraction.id)
    )
    .not("review_status", "is", null)
    .order("position_in_content", { ascending: true });
  if (error) throw new Error(error.message);

  const reviewedAt =
    extractions
      .map((extraction) => extraction.reviewed_at as string | null)
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1) ?? null;
  return { reviewedAt, phrases: data ?? [] };
}
