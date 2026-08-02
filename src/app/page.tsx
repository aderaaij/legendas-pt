import HomePage from "./components/home/HomePage";
import { PhraseExtractionService, LibraryShow } from "@/lib/supabase";

// Regenerate in the background so shows/episodes added by the worker appear
// without a redeploy.
export const revalidate = 300;

export default async function Home() {
  // Server-side data fetching
  let initialShows: LibraryShow[] = [];
  let error: string | null = null;

  try {
    initialShows = await PhraseExtractionService.getLibraryShows();
  } catch (err) {
    error = `Failed to load shows: ${
      err instanceof Error ? err.message : "Unknown error"
    }`;
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
