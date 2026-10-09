/**
 * First consumer of the LLM layer: extract learning phrases from subtitle
 * content in the target language and translate them to English. Provider-
 * agnostic — it asks `providers.ts` for a model and lets the AI SDK handle each
 * provider's native structured-output mechanism via `generateObject`. Pure: no
 * DB, no Next.
 */
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { LANGUAGES, type TargetLanguage } from "@/lib/i18n/languages";
import { getModel, resolveSelection } from "./providers";
import { PROMPT_INFO, quotedBasics } from "./prompt-info";
import type { LlmSelection } from "./types";

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

export interface ExtractPhrasesResult {
  phrases: ExtractedPhrasePair[];
  /** True when the model hit its output-token limit (or returned an unparseable
   *  truncated object). Partial results may be empty. */
  truncated: boolean;
  /** The provider + model actually used, after applying overrides/defaults. */
  resolved: LlmSelection;
}

export async function extractPhrases(
  content: string,
  language: TargetLanguage,
  override?: Partial<LlmSelection>
): Promise<ExtractPhrasesResult> {
  const resolved = resolveSelection(override);
  const model = getModel(resolved);

  try {
    const { object, finishReason } = await generateObject({
      model,
      schema: phraseSchemaFor(language),
      system: buildSystemPrompt(language),
      prompt: buildUserPrompt(content, language),
      maxOutputTokens: 32000,
    });

    return {
      phrases: object.phrases,
      truncated: finishReason === "length",
      resolved,
    };
  } catch (error) {
    // A truncated or otherwise unparseable response surfaces here uniformly
    // across providers, replacing the old manual JSON-repair logic.
    if (NoObjectGeneratedError.isInstance(error)) {
      return { phrases: [], truncated: true, resolved };
    }
    throw error;
  }
}
