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

      const stats = await PhraseExtractionService.getExtractionStats();

      const showsMap = new Map<string, ShowWithExtractions>();

      for (const stat of stats) {
        const showName = stat.show?.name || "Unknown Show";
        const showKey = showName;

        if (!showsMap.has(showKey)) {
          showsMap.set(showKey, {
            id: showKey,
            name: showName,
            source: stat.source || "Unknown",
            extractionCount: 0,
            totalPhrases: 0,
            lastExtraction: stat.created_at || "",
            network: undefined,
            rating: undefined,
            poster_url: undefined,
            tvdb_confidence: undefined,
          });
        }

        const show = showsMap.get(showKey)!;
        show.extractionCount += 1;
        show.totalPhrases += stat.total_phrases_found || 0;

        // Keep the most recent extraction date
        if (stat.created_at && stat.created_at > show.lastExtraction) {
          show.lastExtraction = stat.created_at;
        }
      }

      const showsArray = Array.from(showsMap.values()).sort(
        (a, b) =>
          new Date(b.lastExtraction).getTime() -
          new Date(a.lastExtraction).getTime()
      );

      setShows(showsArray);
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
