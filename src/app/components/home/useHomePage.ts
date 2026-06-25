import { useState, useEffect } from "react";
import { PhraseExtractionService, LibraryShow } from "@/lib/supabase";

interface UseShowsReturn {
  shows: LibraryShow[];
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
  stats: {
    totalShows: number;
    totalExtractions: number;
    totalPhrases: number;
  };
}

export function useHomePage(
  initialShows: LibraryShow[] = [],
  initialStats?: {
    totalShows: number;
    totalExtractions: number;
    totalPhrases: number;
  },
  initialError?: string | null
): UseShowsReturn {
  const [shows, setShows] = useState<LibraryShow[]>(initialShows);
  const [loading, setLoading] = useState(initialShows.length === 0);
  const [error, setError] = useState<string>(initialError || "");

  const loadShows = async () => {
    try {
      setLoading(true);
      setError("");

      const libraryShows = await PhraseExtractionService.getLibraryShows();

      setShows(libraryShows);
    } catch (err) {
      setError(
        `Failed to load shows: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error loading shows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Skip the client fetch when the server already provided shows.
    if (initialShows.length > 0) return;

    let active = true;
    (async () => {
      try {
        const libraryShows = await PhraseExtractionService.getLibraryShows();
        if (active) setShows(libraryShows);
      } catch (err) {
        if (active) {
          setError(
            `Failed to load shows: ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          );
          console.error("Error loading shows:", err);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute stats from shows data (use initial stats if provided)
  const stats = initialStats || {
    totalShows: shows.length,
    totalExtractions: shows.reduce(
      (acc, show) => acc + show.extractionCount,
      0
    ),
    totalPhrases: shows.reduce((acc, show) => acc + show.totalPhrases, 0),
  };

  return {
    shows,
    loading,
    error,
    refetch: loadShows,
    stats,
  };
}
