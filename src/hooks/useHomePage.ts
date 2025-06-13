import { useState, useEffect } from "react";
import { PhraseExtractionService } from "../lib/supabase";

interface ShowWithExtractions {
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

export function useHomePage(): UseShowsReturn {
  const [shows, setShows] = useState<ShowWithExtractions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const loadShows = async () => {
    try {
      setLoading(true);
      setError("");

      const showsWithStats = await PhraseExtractionService.getShowsWithExtractionStats();
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

  // Compute stats from shows data
  const stats = {
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
