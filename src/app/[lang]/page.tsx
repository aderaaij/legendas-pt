import HomePage from "@/app/components/home/HomePage";
import { notFound } from "next/navigation";
import { PhraseExtractionService, LibraryShow } from "@/lib/supabase";
import { isTargetLanguage } from "@/lib/i18n/languages";
import { getDictionary } from "@/lib/i18n/dictionaries";

// Regenerate in the background so shows/episodes added by the worker appear
// without a redeploy.
export const revalidate = 300;

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isTargetLanguage(lang)) notFound();

  // Server-side data fetching
  let initialShows: LibraryShow[] = [];
  let error: string | null = null;

  try {
    initialShows = await PhraseExtractionService.getLibraryShows(lang);
  } catch (err) {
    const t = getDictionary(lang);
    error = t.home.loadError(
      err instanceof Error ? err.message : t.common.unknownError
    );
    console.error("Error loading shows:", err);
  }

  // Compute stats from shows data
  const initialStats = {
    totalShows: initialShows.length,
    totalExtractions: initialShows.reduce(
      (acc, show) => acc + show.extractionCount,
      0
    ),
    totalPhrases: initialShows.reduce((acc, show) => acc + show.totalPhrases, 0),
  };

  return <HomePage initialShows={initialShows} initialStats={initialStats} initialError={error} />;
}
