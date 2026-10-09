/**
 * First consumer of the LLM layer: extract learning phrases from subtitle
 * content in the target language and translate them to English. Provider-
 * agnostic — it asks `providers.ts` for a model and lets the AI SDK handle each
 * provider's native structured-output mechanism via `generateObject`. Pure: no
 * DB, no Next.
 */
import {
  generateObject,
  NoObjectGeneratedError,
  parsePartialJson,
  type LanguageModelUsage,
} from "ai";
import { z } from "zod";
import { LANGUAGES, type TargetLanguage } from "@/lib/i18n/languages";
import { getModel, providerOptionsFor, resolveSelection } from "./providers";
import { PROMPT_INFO, quotedBasics } from "./prompt-info";
import type { LlmSelection, Provider } from "./types";

/**
 * Output ceiling per provider. Claude's tokenizer counts more tokens for the
 * same subtitle text and its models extract more exhaustively, so a long
 * episode needs more room there (Claude 5.5 models support 128K; gpt-4.1-mini
 * caps at ~32K).
 */
const MAX_OUTPUT_TOKENS: Record<Provider, number> = {
  openai: 32000,
  anthropic: 64000,
  google: 32000,
};

function phraseSchemaFor(language: TargetLanguage) {
  const { englishShortName } = LANGUAGES[language];
  return z.object({
    phrases: z.array(
      z.object({
        phrase: z.string().describe(`The exact ${englishShortName} phrase`),
        translation: z.string().describe("Natural English translation"),
      })
    ),
  });
}

type ExtractedPhrasePair = z.infer<
  ReturnType<typeof phraseSchemaFor>
>["phrases"][number];

function buildSystemPrompt(language: TargetLanguage): string {
  const name = LANGUAGES[language].englishShortName;
  return `You are a helpful ${name} language learning assistant. Extract useful phrases from the provided content according to the specified criteria.`;
}

function buildUserPrompt(content: string, language: TargetLanguage): string {
  const { englishName, englishShortName: name } = LANGUAGES[language];
  const { interjections } = PROMPT_INFO[language];
  const basics = quotedBasics(language);
  return `You are a ${name} language learning expert. Analyze the following ${englishName} subtitle content and extract ALL useful phrases for language learners. Be extremely comprehensive and thorough - extract as many valuable learning phrases as possible.

For each phrase, provide:
1. The exact ${name} phrase (preserve original capitalization and structure)
2. A natural English translation

Extract EVERYTHING useful including:
- Complete sentences and meaningful phrases
- Common expressions, idioms, and sayings
- Conversational phrases and responses
- Colloquialisms and everyday language
- Question forms, exclamations, and responses
- Emotional expressions and reactions
- Transitional phrases and connectors
- Commands, requests, and suggestions
- Time expressions and descriptive phrases
- Short but meaningful phrases (3+ words)
- Interjections and common ${name} exclamations
- Verb phrases and common constructions
- Adjective phrases that are commonly used
- Any phrase pattern that would help someone learning ${name}

Only avoid:
- Isolated single words (unless they're meaningful interjections like ${interjections})
- Incomplete fragments that don't make grammatical sense
- Highly technical jargon
- Proper nouns unless they're part of common expressions
- Extremely common basic phrases that beginners already know: ${basics}

CRITICAL REQUIREMENTS:
- NEVER include duplicate phrases - each phrase should appear only once in your response
- Skip overly basic greetings and common courtesy phrases that every beginner knows
- Focus on phrases that provide real learning value beyond basic politeness

IMPORTANT: Be extremely thorough. Extract hundreds of phrases if they exist in the content. This is for dedicated language learners who want maximum exposure to authentic ${englishName}. Don't hold back - extract everything that could be useful for learning.

Content:
${content}`;
}

/**
 * Keep what a cut-off response managed to say. A repaired parse closes the last
 * entry wherever the text stopped, so its translation may be cut short too —
 * it's always dropped (at worst losing one complete phrase).
 */
async function salvagePhrases(
  text: string | undefined
): Promise<ExtractedPhrasePair[]> {
  const { value, state } = await parsePartialJson(text);
  if (state !== "successful-parse" && state !== "repaired-parse") return [];
  const list =
    value && typeof value === "object"
      ? (value as { phrases?: unknown }).phrases
      : undefined;
  if (!Array.isArray(list)) return [];
  const complete = state === "repaired-parse" ? list.slice(0, -1) : list;
  return complete.flatMap((item) =>
    item &&
    typeof item === "object" &&
    !Array.isArray(item) &&
    typeof item.phrase === "string" &&
    typeof item.translation === "string"
      ? [{ phrase: item.phrase, translation: item.translation }]
      : []
  );
}

export interface ExtractPhrasesResult {
  phrases: ExtractedPhrasePair[];
  /** True when the model hit its output-token limit (or returned an unparseable
   *  truncated object). Partial results may be empty. */
  truncated: boolean;
  /** The provider + model actually used, after applying overrides/defaults. */
  resolved: LlmSelection;
  /** Token usage as reported by the provider, when available. */
  usage?: LanguageModelUsage;
}

export async function extractPhrases(
  content: string,
  language: TargetLanguage,
  override?: Partial<LlmSelection>
): Promise<ExtractPhrasesResult> {
  const resolved = resolveSelection(override);
  const model = getModel(resolved);

  try {
    const { object, finishReason, usage } = await generateObject({
      model,
      schema: phraseSchemaFor(language),
      system: buildSystemPrompt(language),
      prompt: buildUserPrompt(content, language),
      maxOutputTokens: MAX_OUTPUT_TOKENS[resolved.provider],
      providerOptions: providerOptionsFor(resolved),
    });

    return {
      phrases: object.phrases,
      truncated: finishReason === "length",
      resolved,
      usage,
    };
  } catch (error) {
    // A truncated or otherwise unparseable response surfaces here uniformly
    // across providers. Keep the complete phrases rather than losing them all.
    if (NoObjectGeneratedError.isInstance(error)) {
      return {
        phrases: await salvagePhrases(error.text),
        truncated: true,
        resolved,
        usage: error.usage,
      };
    }
    throw error;
  }
}
