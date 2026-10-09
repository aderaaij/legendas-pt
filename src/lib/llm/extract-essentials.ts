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
import {
  DEFAULT_MODELS,
  isProvider,
  type LlmSelection,
  type Provider,
} from "./types";

/** Bump when the prompt changes meaningfully; stored in `essentials_params`. */
export const ESSENTIALS_PROMPT_VERSION = 3;

/**
 * Picking essentials takes more judgment than exhaustive extraction: the small
 * default models pick transparent cognates and mangle idioms. So essentials get
 * their own per-provider default, overridable with `ESSENTIALS_LLM_MODEL`.
 */
const ESSENTIALS_MODELS: Record<Provider, string> = {
  ...DEFAULT_MODELS,
  openai: "gpt-4.1",
};

/**
 * Provider: per-call override → `ESSENTIALS_LLM_PROVIDER` → `LLM_PROVIDER` →
 * openai. Model: per-call override → `ESSENTIALS_LLM_MODEL` (only when the
 * provider is the env-configured one, so an override to another provider never
 * gets a mismatched model) → the essentials default for that provider.
 */
function resolveEssentialsSelection(
  override?: Partial<LlmSelection>
): LlmSelection {
  const envProvider =
    process.env.ESSENTIALS_LLM_PROVIDER || process.env.LLM_PROVIDER || "openai";
  const provider = override?.provider || envProvider;
  const model =
    override?.model ||
    (provider === envProvider ? process.env.ESSENTIALS_LLM_MODEL : undefined) ||
    (isProvider(provider) ? ESSENTIALS_MODELS[provider] : undefined);
  // Validates the provider (throws UnknownProviderError) and fills any gap.
  return resolveSelection({ provider: provider as Provider, model });
}

// Field order matters: the model writes the real line first, then lifts the
// chunk out of it, which keeps expression and example consistent.
// `.nullable()` rather than `.optional()`, and no array bounds: OpenAI's strict
// structured output requires every key to be present and rejects min/max items.
const essentialsSchema = z.object({
  essentials: z.array(
    z.object({
      example: z
        .string()
        .describe("A subtitle line where the chunk occurs, copied exactly"),
      expression: z
        .string()
        .describe("The chunk from that line, in dictionary form"),
      translation: z
        .string()
        .describe("What it means in this episode, in short natural English"),
      importance: z
        .number()
        .describe("3 = needed to follow the episode, 2 = clearly useful, 1 = nice to know"),
      exampleTranslation: z
        .string()
        .describe("Natural English translation of the example line"),
      note: z
        .string()
        .nullable()
        .describe("One short usage/register note, or null"),
    })
  ),
});

export type EssentialCandidate = z.infer<
  typeof essentialsSchema
>["essentials"][number];

function buildPrompt(subtitleText: string, language: TargetLanguage): string {
  const { englishName, englishShortName: name } = LANGUAGES[language];
  const { placeholders, region, common } = PROMPT_INFO[language];
  const known = [quotedBasics(language), ...common.map((w) => `"${w}"`)].join(", ");
  return `You are preparing an intermediate (B1) learner of ${englishName} to watch one episode of a TV series. Below are the episode's subtitles, one line per cue.

Choose 30–40 candidate ESSENTIAL expressions for this episode — the ones a learner must know to follow it — and score each one's importance.

An essential is a short, REUSABLE chunk (usually 1–4 words) that the learner will meet again in other conversations:
- idioms, colloquialisms and slang whose meaning can't be guessed word by word
- fixed expressions and verb + preposition combinations
- words that are key to this episode's story or setting and that a B1 learner wouldn't know
Prefer chunks that recur in this episode or carry an important moment of the plot.

Never include:
- a whole subtitle line, or a phrase that only makes sense in this story — take the reusable chunk inside the line instead, or skip the line
- anything an A2 learner already knows, such as ${known}, greetings, courtesy phrases, or very common verbs and adverbs in their basic meaning
- names of people or places
- transparent cognates whose meaning is obvious to an English speaker

For each essential, fill the fields in this order:
1. example: one line from the subtitles below, copied exactly, in which the chunk occurs
2. expression: that chunk, taken from the example line, in ${name} dictionary form — conjugated verbs back to the infinitive, nouns and adjectives in the masculine singular, no slashes or brackets, ${placeholders} as placeholders where an object is needed
3. translation: what the expression means in this episode, in short natural English
4. importance: 3 if a learner would struggle to follow the episode without it (it recurs, or a key moment depends on it), 2 if it's clearly useful here, 1 if it's only nice to know
5. exampleTranslation: a natural English translation of the example line
6. note: one short note on register or usage (e.g. "informal", "rude", "very common in ${region}"), or null when there's nothing useful to add

No duplicates. Return 30–40 candidates (fewer only if there is very little dialogue).

Subtitles:
${subtitleText}`;
}

export interface ExtractEssentialsResult {
  /** Scored candidates in the model's order (unfiltered model output). */
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
  const resolved = resolveEssentialsSelection(override);
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
