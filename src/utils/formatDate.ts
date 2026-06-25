export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const PT_MONTHS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

// Deterministic Portuguese short date (e.g. "16 ago 2021"). Uses UTC getters so
// the server and client render identically (no hydration mismatch).
export const formatDatePt = (dateString?: string | null) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${PT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
