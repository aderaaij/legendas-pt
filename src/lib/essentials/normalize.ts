/**
 * The lexicon key for an essential: two spellings of the same expression must
 * map to the same key so progress is shared across episodes. Pure.
 *
 * Accents are KEPT — avó/avô, pais/país and esta/está are different words. The
 * result never contains double quotes, backslashes or brackets, so it is safe
 * inside a PostgREST `in.(…)` filter.
 */
import { LANGUAGES, type TargetLanguage } from "@/lib/i18n/languages";

// Punctuation allowed to wrap an expression but not part of it.
const EDGE_PUNCTUATION = /^[\s¡¿!?.,;:…'‘’\-–—]+|[\s¡¿!?.,;:…'‘’\-–—]+$/g;

export function normalizeExpression(
  expression: string,
  language: TargetLanguage
): string {
  return expression
    .normalize("NFC")
    .toLocaleLowerCase(LANGUAGES[language].locale)
    .replace(/["“”«»\\]/g, "")
    .replace(/\((?:a|as|os)\)/g, "") // "cansado(a)"
    .replace(/\/(?:a|as|os)\b/g, "") // "cansado/a"
    .replace(/[()[\]]/g, "") // "dar com (alguém)" → "dar com alguém"
    .replace(/\s+/g, " ")
    .replace(EDGE_PUNCTUATION, "")
    .trim();
}
