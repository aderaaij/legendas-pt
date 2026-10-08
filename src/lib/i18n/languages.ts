/**
 * Target languages — the language a learner studies (and the language the
 * public UI chrome is rendered in, for immersion). UI-safe: no server imports,
 * shared by the proxy, server components, client components and the worker.
 *
 * A show's `language` column holds one of these codes; everything downstream
 * (episodes, extractions, phrases, study cards) inherits it from the show.
 */

export type TargetLanguage = "pt" | "es";

export const TARGET_LANGUAGES: TargetLanguage[] = ["pt", "es"];

export const DEFAULT_LANGUAGE: TargetLanguage = "pt";

/** Cookie holding the learner's selected target language (read by `src/proxy.ts`). */
export const LANGUAGE_COOKIE = "cena-lang";

export interface LanguageInfo {
  code: TargetLanguage;
  /** Short uppercase tag, e.g. for "PT → EN". */
  tag: string;
  /** The language's name in English (LLM prompts, admin UI). */
  englishName: string;
  /** Short English name for compact admin labels, e.g. "Spanish Phrase". */
  englishShortName: string;
  /** BCP 47 locale for the variety we teach (dates, `<html lang>`). */
  locale: string;
  flag: string;
}

export const LANGUAGES: Record<TargetLanguage, LanguageInfo> = {
  pt: {
    code: "pt",
    tag: "PT",
    englishName: "European Portuguese",
    englishShortName: "Portuguese",
    locale: "pt-PT",
    flag: "🇵🇹",
  },
  es: {
    code: "es",
    tag: "ES",
    englishName: "Spanish (Spain)",
    englishShortName: "Spanish",
    locale: "es-ES",
    flag: "🇪🇸",
  },
};

export function isTargetLanguage(value: unknown): value is TargetLanguage {
  return (
    typeof value === "string" &&
    (TARGET_LANGUAGES as string[]).includes(value)
  );
}

/**
 * Normalize a stored language value (e.g. `shows.language`) to a target
 * language. Rows created before multi-language support may carry null, which
 * means Portuguese.
 */
export function toTargetLanguage(value: unknown): TargetLanguage {
  return isTargetLanguage(value) ? value : DEFAULT_LANGUAGE;
}
