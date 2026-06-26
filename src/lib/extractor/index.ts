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
  parseVTTWithTimestamps,
  parseSRTWithTimestamps,
  matchPhrasesToTimestamps,
  type SubtitleBlock,
  type PhraseWithTimestamp,
} from "@/utils/subtitleUtils";
import { extractPhrases } from "@/lib/llm/extract-phrases";
import type { LlmSelection, Provider } from "@/lib/llm/types";

export interface ExtractInput {
  /** Raw subtitle text (VTT/SRT/plain). */
  content: string;
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
  const { content, filename, fileType, provider, model } = input;

  // Parse subtitles with timestamps when the format is VTT or SRT. The text fed
  // to the model is the cue text joined together; timing is kept for re-matching.
  let originalBlocks: SubtitleBlock[] = [];
  let contentForAI = content;

  try {
    if (fileType === "vtt" || filename?.endsWith(".vtt")) {
      originalBlocks = parseVTTWithTimestamps(content);
      contentForAI = originalBlocks.map((block) => block.text).join(" ");
    } else if (fileType === "srt" || filename?.endsWith(".srt")) {
      originalBlocks = parseSRTWithTimestamps(content);
      contentForAI = originalBlocks.map((block) => block.text).join(" ");
    }
  } catch (timestampParseError) {
    console.warn(
      "Failed to parse timestamps, falling back to original content:",
      timestampParseError
    );
    contentForAI = content;
  }

  const extraction = await extractPhrases(contentForAI, {
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
