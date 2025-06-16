import HomePage from "./components/HomePage";
import { PhraseExtractionService } from "@/lib/supabase";
import { ShowWithExtractions } from "@/hooks/useHomePage";

export default async function Home() {
  // Server-side data fetching
  let initialShows: ShowWithExtractions[] = [];
  let error: string | null = null;

  try {
    initialShows = await PhraseExtractionService.getShowsWithExtractionStats();
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
