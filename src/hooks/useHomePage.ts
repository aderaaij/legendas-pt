import { useState, useEffect } from "react";
import { PhraseExtractionService } from "../lib/supabase";

export interface ShowWithExtractions {
  id: string;
  name: string;
  source: string;
  extractionCount: number;
  totalPhrases: number;
  lastExtraction: string;
  season?: number;
  episodeNumber?: number;
  network?: string;
  rating?: number;
  poster_url?: string;
  tvdb_confidence?: number;
}

interface UseShowsReturn {
  shows: ShowWithExtractions[];
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
  initialShows: ShowWithExtractions[] = [],
  initialStats?: {
    totalShows: number;
    totalExtractions: number;
    totalPhrases: number;
  },
  initialError?: string | null
): UseShowsReturn {
  const [shows, setShows] = useState<ShowWithExtractions[]>(initialShows);
  const [loading, setLoading] = useState(initialShows.length === 0);
  const [error, setError] = useState<string>(initialError || "");

  const loadShows = async () => {
    try {
      setLoading(true);
      setError("");

      const showsWithStats =
        await PhraseExtractionService.getShowsWithExtractionStats();

      setShows(showsWithStats);
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
    loadShows();
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
