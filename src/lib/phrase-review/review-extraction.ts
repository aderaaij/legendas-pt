/**
 * Review one extraction's phrase translations and store the suggestions for an
 * admin to accept or reject: the worker's single entry point, shared by the
 * series import and manual upload. Holds the LLM call, so it must only be
 * imported by the worker (and scripts).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { reviewTranslationsFromSubtitle } from "@/lib/extractor";
import { REVIEW_PROMPT_VERSION } from "@/lib/llm/review-phrases";
import { getPhrasesToReview, saveReviewFlags } from "@/lib/db/phrase-review";
import type { TargetLanguage } from "@/lib/i18n/languages";

export interface ReviewExtractionInput {
  extractionId: string;
  language: TargetLanguage;
  /** Raw subtitle text (VTT/SRT/plain) the phrases were extracted from. */
  content: string;
  filename?: string;
  fileType?: "vtt" | "srt" | "txt";
}

/** Returns how many suggestions are now pending. Throws on any failure. */
export async function reviewExtraction(
  client: SupabaseClient,
  { extractionId, ...subtitle }: ReviewExtractionInput
): Promise<number> {
  const phrases = await getPhrasesToReview(client, extractionId);
  const { fixes, resolved } = phrases.length
    ? await reviewTranslationsFromSubtitle({ ...subtitle, phrases })
    : { fixes: [], resolved: undefined };

  // An admin's earlier accept/reject stands; only undecided phrases get flagged.
  const flags = fixes.flatMap((fix) => {
    const phrase = phrases[fix.index];
    return phrase.review_status === "accepted" || phrase.review_status === "rejected"
      ? []
      : [{ phraseId: phrase.id, translation: fix.translation, issue: fix.issue }];
  });

  return saveReviewFlags(client, {
    extractionId,
    flags,
    params: { ...resolved, promptVersion: REVIEW_PROMPT_VERSION },
  });
}
