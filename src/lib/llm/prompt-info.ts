/**
 * The language-specific bits shared by the LLM prompts (phrase extraction and
 * essentials). Pure data.
 */
import type { TargetLanguage } from "@/lib/i18n/languages";

interface LanguagePromptInfo {
  /** Example interjections worth keeping despite being single words. */
  interjections: string;
  /** Basics every beginner knows, which aren't worth a card. */
  basics: string[];
  /** Everyday words an A2 learner knows, which aren't essentials either. */
  common: string[];
  /** Placeholder words for the essentials prompt ("someone" / "something"). */
  placeholders: string;
  /** Where the variety we teach is spoken, for usage notes. */
  region: string;
}

export const PROMPT_INFO: Record<TargetLanguage, LanguagePromptInfo> = {
  pt: {
    interjections: `"Bolas!" or "Fogo!"`,
    basics: ["boa noite", "bom dia", "boa tarde", "obrigado", "obrigada", "por favor", "desculpa", "com licença", "olá", "adeus", "tchau", "sim", "não"],
    common: ["está bem", "tudo bem", "vamos", "anda", "rápido", "claro", "pois", "então", "olha"],
    placeholders: `"alguém" / "algo"`,
    region: "Portugal",
  },
  es: {
    interjections: `"¡Venga!" or "¡Ostras!"`,
    basics: ["hola", "adiós", "buenos días", "buenas tardes", "buenas noches", "gracias", "por favor", "perdón", "lo siento", "sí", "no"],
    common: ["está bien", "vale", "vamos", "rápido", "claro", "bueno", "pues", "mira", "oye"],
    placeholders: `"alguien" / "algo"`,
    region: "Spain",
  },
};

/** `basics` quoted and comma-joined for a prompt. */
export function quotedBasics(language: TargetLanguage): string {
  return PROMPT_INFO[language].basics.map((b) => `"${b}"`).join(", ");
}
