/**
 * The Extractor: subtitle content → validated, timestamp-matched phrases.
 *
 * Pure — no Supabase, no Next, outbound-only (the LLM call). It wraps subtitle
 * parsing (`subtitleUtils`) and the provider-agnostic LLM layer (`lib/llm`) into
 * the single extraction path shared by the Next route and the worker. The seam
 * to persistence is the returned `ExtractResult` — a plain serializable object —
 * so the same call works in-process, over a queue, or as an HTTP service.
 *
 * This is the "offerable core" from the worker hand-off: it holds the LLM keys at
 * runtime and knows nothing about jobs or the database.
 */
import {
  matchPhrasesToTimestamps,
  type PhraseWithTimestamp,
} from "@/utils/subtitleUtils";
import { extractPhrases } from "@/lib/llm/extract-phrases";
import {
  extractEssentials,
  type EssentialCandidate,
} from "@/lib/llm/extract-essentials";
import { PROMPT_INFO } from "@/lib/llm/prompt-info";
import type { LlmSelection, Provider } from "@/lib/llm/types";
import type { TargetLanguage } from "@/lib/i18n/languages";
import { normalizeExpression } from "@/lib/essentials/normalize";
import { subtitleToBlocks } from "./subtitle-text";

export interface ExtractInput {
  /** Raw subtitle text (VTT/SRT/plain). */
  content: string;
  /** The language the subtitles are in (phrases are extracted in it). */
  language: TargetLanguage;
  /** Original filename, used to infer the subtitle format when `fileType` is absent. */
  filename?: string;
  /** Explicit subtitle format; falls back to the filename extension. */
  fileType?: "vtt" | "srt" | "txt";
  /** Per-call provider override; falls back to `LLM_PROVIDER` env then default. */
  provider?: Provider | null;
  /** Per-call model override; falls back to `LLM_MODEL` env then provider default. */
  model?: string | null;
}

export interface ExtractResult {
  /** Validated phrases, timestamp-matched when the source carried timing. */
  phrases: PhraseWithTimestamp[];
  /** True when the model hit its output-token limit (results may be partial). */
  truncated: boolean;
  /** The provider + model actually used, after applying overrides/defaults. */
  resolved: LlmSelection;
}

/**
 * Run the extraction pipeline: parse timing (if VTT/SRT) → LLM extract+translate
 * → drop empty/too-short entries → match phrases back to their cue timestamps.
 *
 * Throws `MissingApiKeyError` / `UnknownProviderError` from the LLM layer when the
 * selected provider isn't usable — callers map those to their own error surface.
 */
export async function extractFromSubtitle(
  input: ExtractInput
): Promise<ExtractResult> {
  const { content, language, filename, fileType, provider, model } = input;

  // Parse subtitles with timestamps when the format is VTT or SRT. The text fed
  // to the model is the cue text joined together; timing is kept for re-matching.
  const originalBlocks = subtitleToBlocks(content, { filename, fileType }) ?? [];
  const contentForAI =
    originalBlocks.length > 0
      ? originalBlocks.map((block) => block.text).join(" ")
      : content;

  const extraction = await extractPhrases(contentForAI, language, {
    provider: provider ?? undefined,
    model: model ?? undefined,
  });

  // The schema guarantees the shape; this drops empty or too-short entries.
  const validPhrases = extraction.phrases.filter(
    (phrase) =>
      phrase.phrase &&
      phrase.translation &&
      typeof phrase.phrase === "string" &&
      typeof phrase.translation === "string" &&
      phrase.phrase.trim().length > 5
  );

  // Match phrases back to their timestamped blocks when we have timing.
  const phrases =
    originalBlocks.length > 0
      ? matchPhrasesToTimestamps(validPhrases, originalBlocks)
      : validPhrases.map((phrase) => ({ ...phrase, matchedConfidence: 0 }));

  return {
    phrases,
    truncated: extraction.truncated,
    resolved: extraction.resolved,
  };
}

export interface ExtractEssentialsFromSubtitleResult {
  /** Ranked (most important first), filtered and capped. */
  essentials: EssentialCandidate[];
  resolved: LlmSelection;
}

/** Most essentials an episode keeps; the prompt asks for 20–30. */
const MAX_ESSENTIALS = 40;
/** Longer than this is a whole line creeping back in, not a reusable chunk. */
const MAX_EXPRESSION_WORDS = 8;

/**
 * Pick an episode's essentials: parse cues (one per line, so the model can quote
 * "the line as heard") → LLM select + rank → drop empty, over-long and
 * beginner-basic items → cap.
 *
 * Throws like `extractFromSubtitle`, and also on unparseable model output.
 */
export async function extractEssentialsFromSubtitle(
  input: ExtractInput
): Promise<ExtractEssentialsFromSubtitleResult> {
  const { content, language, filename, fileType, provider, model } = input;

  const blocks = subtitleToBlocks(content, { filename, fileType });
  const subtitleText = blocks
    ? blocks.map((block) => block.text).join("\n")
    : content;

  const { essentials, resolved } = await extractEssentials(
    subtitleText,
    language,
    { provider: provider ?? undefined, model: model ?? undefined }
  );

  const basics = new Set(
    PROMPT_INFO[language].basics.map((b) => normalizeExpression(b, language))
  );
  const kept = essentials.filter((item) => {
    const expression = item.expression?.trim();
    if (!expression || !item.translation?.trim()) return false;
    if (expression.split(/\s+/).length > MAX_EXPRESSION_WORDS) return false;
    return !basics.has(normalizeExpression(expression, language));
  });

  return { essentials: kept.slice(0, MAX_ESSENTIALS), resolved };
}
