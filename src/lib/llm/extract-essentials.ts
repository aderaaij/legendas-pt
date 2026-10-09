/**
 * Second LLM consumer: pick an episode's "essentials" — the 20–30 expressions a
 * learner needs to follow it — from its subtitle text. Unlike the exhaustive
 * phrase extraction, this is selective and ranked, and returns short reusable
 * chunks in dictionary form rather than whole lines. Pure: no DB, no Next.
 */
import { generateObject } from "ai";
import { z } from "zod";
import { LANGUAGES, type TargetLanguage } from "@/lib/i18n/languages";
import { getModel, resolveSelection } from "./providers";
import { PROMPT_INFO, quotedBasics } from "./prompt-info";
import type { LlmSelection } from "./types";

/** Bump when the prompt changes meaningfully; stored in `essentials_params`. */
export const ESSENTIALS_PROMPT_VERSION = 1;

// `.nullable()` rather than `.optional()`, and no array bounds: OpenAI's strict
// structured output requires every key to be present and rejects min/max items.
const essentialsSchema = z.object({
  essentials: z.array(
    z.object({
      expression: z
        .string()
        .describe("The expression in dictionary form (a short chunk, not a whole line)"),
      translation: z
        .string()
        .describe("What it means in this episode, in short natural English"),
      note: z
        .string()
        .nullable()
        .describe("One short usage/register note, or null"),
      example: z
        .string()
        .describe("A subtitle line where it occurs, copied exactly"),
      exampleTranslation: z
        .string()
        .describe("Natural English translation of the example line"),
    })
  ),
});

export type EssentialCandidate = z.infer<
  typeof essentialsSchema
>["essentials"][number];

function buildPrompt(subtitleText: string, language: TargetLanguage): string {
  const { englishName, englishShortName: name } = LANGUAGES[language];
  const { dictionaryForm, placeholders, region } = PROMPT_INFO[language];
  const [form, notForm] = dictionaryForm;
  return `You are preparing an intermediate (B1) learner of ${englishName} to watch one episode of a TV series. Below are the episode's subtitles, one line per cue.

Choose the ESSENTIAL expressions: the 20–30 a learner must know to follow this episode. Rank them, most important first.

What makes an expression essential:
- It recurs in this episode, or carries a key moment of the plot
- It's idiomatic, colloquial or slang, so its meaning can't be guessed word by word
- It's a key word for this episode's story or setting that a B1 learner wouldn't know
- Fixed expressions and verb + preposition combinations are especially valuable

Do NOT include:
- Whole subtitle lines or full sentences — essentials are short, reusable chunks (usually 1–5 words)
- Words or phrases a beginner already knows, such as: ${quotedBasics(language)}
- Names of people or places, unless part of an expression
- Transparent cognates whose meaning is obvious to an English speaker

For each essential:
- expression: the ${name} dictionary form — verbs in the infinitive ("${form}", not "${notForm}"), nouns and adjectives in the masculine singular, no slashes or brackets, ${placeholders} as placeholders where needed
- translation: what it means in THIS episode, in short natural English
- note: one short note on register or usage (e.g. "informal", "rude", "very common in ${region}"), or null when there's nothing useful to add
- example: one subtitle line where it occurs, copied exactly from the subtitles below
- exampleTranslation: a natural English translation of that line

Return 20–30 essentials (up to 40 only for very dense episodes; fewer only if there is very little dialogue). No duplicates.

Subtitles:
${subtitleText}`;
}

export interface ExtractEssentialsResult {
  /** Ranked candidates, most important first (unfiltered model output). */
  essentials: EssentialCandidate[];
  /** The provider + model actually used, after applying overrides/defaults. */
  resolved: LlmSelection;
}

/**
 * Throws on provider errors and on unparseable output (`NoObjectGeneratedError`)
 * — the output is small, so a failure is worth a retry rather than a partial.
 */
export async function extractEssentials(
  subtitleText: string,
  language: TargetLanguage,
  override?: Partial<LlmSelection>
): Promise<ExtractEssentialsResult> {
  const resolved = resolveSelection(override);
  const model = getModel(resolved);

  const { object } = await generateObject({
    model,
    schema: essentialsSchema,
    system: `You are an expert ${LANGUAGES[language].englishShortName} teacher who prepares learners to watch TV in the original language.`,
    prompt: buildPrompt(subtitleText, language),
    maxOutputTokens: 8000,
  });

  return { essentials: object.essentials, resolved };
}
