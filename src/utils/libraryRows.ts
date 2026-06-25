import { LibraryShow } from "@/lib/supabase";

export interface LibraryRow {
  key: string;
  title: string;
  note?: string;
  shows: LibraryShow[];
}

function genresOf(show: LibraryShow): string[] {
  if (show.genres && show.genres.length) {
    return show.genres.map((g) => g.trim()).filter(Boolean);
  }
  if (show.genre) {
    return show.genre
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Picks the "featured" show for the hero — the one with the most extracted
 * phrases (the most substantial to study).
 */
export function pickFeaturedShow(shows: LibraryShow[]): LibraryShow | null {
  if (shows.length === 0) return null;
  return shows.reduce((best, s) =>
    s.totalPhrases > best.totalPhrases ? s : best
  );
}

/**
 * Builds Netflix-style horizontal rows entirely from real data. Rows
 * intentionally reuse shows across categories (as the mockup does). Rows that
 * would depend on per-show study progress are omitted.
 */
export function buildLibraryRows(shows: LibraryShow[]): LibraryRow[] {
  if (shows.length === 0) return [];
  const rows: LibraryRow[] = [];

  const recent = [...shows].sort(
    (a, b) =>
      new Date(b.lastExtraction).getTime() -
      new Date(a.lastExtraction).getTime()
  );
  rows.push({
    key: "recent",
    title: "Adicionado recentemente",
    note: "Atualizado esta semana",
    shows: recent,
  });

  // Genre rows — only genres shared by at least two shows, top 3 by size.
  const genreMap = new Map<string, LibraryShow[]>();
  for (const show of shows) {
    for (const genre of genresOf(show)) {
      const arr = genreMap.get(genre) ?? [];
      arr.push(show);
      genreMap.set(genre, arr);
    }
  }
  const genreRows = [...genreMap.entries()]
    .filter(([, arr]) => arr.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3);
  for (const [genre, arr] of genreRows) {
    rows.push({ key: `genre-${genre}`, title: genre, shows: arr });
  }

  // A "most phrases" row only adds value when there are enough shows.
  if (shows.length >= 4) {
    rows.push({
      key: "most",
      title: "Mais frases para estudar",
      shows: [...shows].sort((a, b) => b.totalPhrases - a.totalPhrases),
    });
  }

  return rows;
}
