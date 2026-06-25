// Deterministic, cinematic gradient "poster art" derived from a show name.
// Used as a fallback whenever a show has no real poster_url, so the CENA
// library still looks intentional rather than empty.

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  return Math.abs(hash);
}

/**
 * Returns a CSS `background` value (a layered gradient) seeded from `seed`.
 * The same seed always produces the same artwork.
 */
export function posterGradient(seed: string): string {
  const h = hashString(seed || "cena");
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + (h % 80)) % 360;
  const angle = 150 + (h % 40);

  const highlight = `hsl(${hue1} 85% 62% / 0.55)`;
  const top = `hsl(${hue1} 72% 46%)`;
  const mid = `hsl(${hue2} 60% 30%)`;
  const base = `hsl(${(hue2 + 200) % 360} 45% 8%)`;

  return (
    `radial-gradient(circle at 30% 22%, ${highlight}, transparent 58%), ` +
    `linear-gradient(${angle}deg, ${top} 0%, ${mid} 55%, ${base} 100%)`
  );
}

/** Extract a 4-digit year from an ISO/date string, or null when unavailable. */
export function yearFrom(dateString?: string | null): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return String(date.getFullYear());
}
