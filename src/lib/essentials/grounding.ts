/**
 * Checks that an LLM-picked essential is grounded in the episode: its example
 * line really occurs in the subtitles, and the expression really comes from
 * that line. Catches hallucinated examples and expression/example mismatches,
 * which a smaller model produces regularly. Pure.
 */

/** Loose form for matching: no accents, punctuation or case; single spaces. */
function looseText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const PLACEHOLDERS = new Set(["alguem", "algo", "alguien"]);
// Long enough to tell words apart, short enough to survive regular conjugation
// ("pegar" ~ "pegamos"); irregular forms ("fazer" ~ "fizeram") need another word.
const STEM_LENGTH = 4;

export function createGroundingCheck(subtitleText: string) {
  const subtitle = ` ${looseText(subtitleText)} `;

  return (item: { example: string; expression: string }): boolean => {
    const example = looseText(item.example);
    if (!example || !subtitle.includes(` ${example} `)) return false;

    const exampleWords = example.split(" ");
    const stems = looseText(item.expression)
      .split(" ")
      .filter((word) => word.length >= STEM_LENGTH && !PLACEHOLDERS.has(word))
      .map((word) => word.slice(0, STEM_LENGTH));
    // Only short words ("dar com"): nothing reliable to compare, keep it.
    if (stems.length === 0) return true;
    return stems.some((stem) => exampleWords.some((word) => word.startsWith(stem)));
  };
}
