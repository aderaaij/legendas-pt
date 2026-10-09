// Translation review persistence (database/phrase_review.sql).
//
// Framework-free like the other db modules, and free of runtime imports from
// `@/lib/llm`: the episode edit page reads suggestions in the Next bundle, the
// worker writes them with its service-role client. Accepting or rejecting a
// suggestion is a plain `updatePhrase` (lib/db/phrases.ts).
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase-client";
import type { ExtractedPhrase, ReviewStatus } from "@/types/database";

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
