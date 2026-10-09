/**
 * Third LLM consumer: a stronger model reviews the translations a cheaper model
 * made during phrase extraction, against the whole episode, and returns only
 * the ones it gets wrong. Reading is cheap and writing is expensive, so a
 * review that outputs a handful of fixes costs a fraction of a full extraction
 * by the same model. Pure: no DB, no Next.
 */
import { generateObject, type LanguageModelUsage } from "ai";
import { z } from "zod";
import { LANGUAGES, type TargetLanguage } from "@/lib/i18n/languages";
import { getModel, providerOptionsFor, resolveSelection } from "./providers";
import { PROMPT_INFO } from "./prompt-info";
import type { LlmSelection } from "./types";

/** Bump when the prompt changes meaningfully. */
export const REVIEW_PROMPT_VERSION = 2;

/** Used when the caller doesn't pick a reviewer. */
const DEFAULT_REVIEWER: LlmSelection = {
  provider: "anthropic",
  model: "claude-sonnet-5-5",
  effort: "low",
};

// `misleads` comes before the new translation so the model has to name the
// meaning error first, which keeps out style-only rewrites.
const reviewSchema = z.object({
  fixes: z.array(
    z.object({
      id: z.number().describe("The number of the phrase being fixed"),
      misleads: z
        .string()
        .describe(
          "What a learner would wrongly believe the phrase means, going by the current translation"
        ),
      translation: z
        .string()
        .describe("The corrected English translation of this phrase alone"),
    })
  ),
});

export interface PhraseForReview {
  phrase: string;
  translation: string;
}

interface TranslationFix {
  /** Index into the reviewed phrase list (0-based). */
  index: number;
  /** What the old translation would wrongly teach. */
  issue: string;
  translation: string;
}

const normalize = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

export interface ReviewPhrasesResult {
  fixes: TranslationFix[];
  resolved: LlmSelection;
  usage?: LanguageModelUsage;
}

function buildPrompt(
  subtitleText: string,
  phrases: PhraseForReview[],
  language: TargetLanguage
): string {
  const { englishName } = LANGUAGES[language];
  const { region } = PROMPT_INFO[language];
  const list = phrases
    .map((p, i) => `${i + 1}. ${p.phrase} — ${p.translation}`)
    .join("\n");
  return `Below are the subtitles of one episode of a TV series from ${region}, followed by numbered phrases taken from them, each with an English translation made by another model. Each phrase becomes a flashcard: the learner sees the phrase and its translation and nothing else. A translation that gives the wrong meaning teaches the learner something false — those are what you are looking for.

How to judge a translation:
- It translates the phrase itself. Use the surrounding subtitles only to work out what the phrase means (who is talking to whom, which sense of a word is meant); never add information from other lines to the translation.
- An idiom or fixed expression should get an equivalent English idiom or a plain paraphrase of its meaning. If the current translation already does that, it is correct — do not make it more literal.
- Different wording with the same meaning is correct. Style, register, British vs American English, or a translation you would merely have phrased differently are not errors.

Report a phrase only when you are confident the current translation would make a learner believe something wrong about its meaning, for example:
- a word taken in the wrong sense (informal, slang or regional meanings in ${englishName} can differ from the standard meaning or from a neighbouring language)
- an idiom translated word for word, so its meaning is lost
- the wrong person, gender, number or tense, where the subtitles make it clear
- part of the phrase's meaning left out, or meaning added that the phrase doesn't have

Most translations are correct. Return only real errors, or an empty list.

Subtitles:
${subtitleText}

Phrases:
${list}`;
}

/**
 * Review phrase translations. Returns fixes keyed by 0-based index into
 * `phrases`; fixes that point outside the list are dropped. Throws on provider
 * errors and unparseable output, like the other consumers.
 */
export async function reviewPhrases(
  subtitleText: string,
  phrases: PhraseForReview[],
  language: TargetLanguage,
  override?: Partial<LlmSelection>
): Promise<ReviewPhrasesResult> {
  // Another provider's override mustn't inherit the default reviewer's model.
  const base =
    override?.provider && override.provider !== DEFAULT_REVIEWER.provider
      ? {}
      : DEFAULT_REVIEWER;
  const resolved = resolveSelection({ ...base, ...override });
  const model = getModel(resolved);

  const { object, usage } = await generateObject({
    model,
    schema: reviewSchema,
    system: `You are a meticulous reviewer of ${LANGUAGES[language].englishName} to English translations for a language-learning app.`,
    prompt: buildPrompt(subtitleText, phrases, language),
    maxOutputTokens: 16000,
    providerOptions: providerOptionsFor(resolved),
  });

  // Drop out-of-range ids and "fixes" that only restate the current translation.
  const fixes = object.fixes
    .filter((fix) => fix.id >= 1 && fix.id <= phrases.length)
    .filter(
      (fix) =>
        fix.translation.trim() &&
        normalize(fix.translation) !== normalize(phrases[fix.id - 1].translation)
    )
    .map((fix) => ({
      index: fix.id - 1,
      issue: fix.misleads,
      translation: fix.translation,
    }));
  return { fixes, resolved, usage };
}
