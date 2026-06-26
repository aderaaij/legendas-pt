/**
 * First consumer of the LLM layer: extract Portuguese learning phrases from
 * subtitle content and translate them to English. Provider-agnostic — it asks
 * `providers.ts` for a model and lets the AI SDK handle each provider's native
 * structured-output mechanism via `generateObject`. Pure: no DB, no Next.
 */
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { getModel, resolveSelection } from "./providers";
import type { LlmSelection } from "./types";

const phraseSchema = z.object({
  phrases: z.array(
    z.object({
      phrase: z.string().describe("The exact Portuguese phrase"),
      translation: z.string().describe("Natural English translation"),
    })
  ),
});

type ExtractedPhrasePair = z.infer<typeof phraseSchema>["phrases"][number];

const SYSTEM_PROMPT =
  "You are a helpful Portuguese language learning assistant. Extract useful phrases from the provided content according to the specified criteria.";

function buildUserPrompt(content: string): string {
  return `You are a Portuguese language learning expert. Analyze the following Portuguese subtitle content and extract ALL useful phrases for language learners. Be extremely comprehensive and thorough - extract as many valuable learning phrases as possible.

For each phrase, provide:
1. The exact Portuguese phrase (preserve original capitalization and structure)
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
- Interjections and common Portuguese exclamations
- Verb phrases and common constructions
- Adjective phrases that are commonly used
- Any phrase pattern that would help someone learning Portuguese

Only avoid:
- Isolated single words (unless they're meaningful interjections like "Nossa!" or "Puxa!")
- Incomplete fragments that don't make grammatical sense
- Highly technical jargon
- Proper nouns unless they're part of common expressions
- Extremely common basic phrases that beginners already know: "boa noite", "bom dia", "boa tarde", "obrigado", "obrigada", "por favor", "desculpa", "com licença", "olá", "tchau", "sim", "não"

CRITICAL REQUIREMENTS:
- NEVER include duplicate phrases - each phrase should appear only once in your response
- Skip overly basic greetings and common courtesy phrases that every beginner knows
- Focus on phrases that provide real learning value beyond basic politeness

IMPORTANT: Be extremely thorough. Extract hundreds of phrases if they exist in the content. This is for dedicated language learners who want maximum exposure to authentic Portuguese. Don't hold back - extract everything that could be useful for learning.

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
  override?: Partial<LlmSelection>
): Promise<ExtractPhrasesResult> {
  const resolved = resolveSelection(override);
  const model = getModel(resolved);

  try {
    const { object, finishReason } = await generateObject({
      model,
      schema: phraseSchema,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(content),
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
