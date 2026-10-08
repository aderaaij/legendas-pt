import type { TargetLanguage } from "@/lib/i18n/languages";

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const SHORT_MONTHS: Record<TargetLanguage, string[]> = {
  pt: [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ],
  es: [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sept", "oct", "nov", "dic",
  ],
};

// Deterministic short date in the UI language (e.g. pt "16 ago 2021", es
// "3 dic 2021"). Uses UTC getters so the server and client render identically
// (no hydration mismatch).
export const formatShortDate = (
  dateString: string | null | undefined,
  lang: TargetLanguage
) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${SHORT_MONTHS[lang][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
