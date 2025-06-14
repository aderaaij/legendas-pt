interface TVDBShow {
  id: number;
  name: string;
  slug: string;
  overview?: string;
  firstAired?: string;
  network?: string;
  status?: string;
  image?: string;
  genres?: string[];
  rating?: number;
}

interface TVDBEpisode {
  id: number;
  name?: string;
  overview?: string;
  aired?: string;
  seasonNumber?: number;
  number?: number;
  runtime?: number;
  image?: string;
}

interface RemoteId {
  id: string;
  type: number;
  sourceName: string;
}

interface Overviews {
  eng?: string;
  por?: string;
  [key: string]: string | undefined; // Allow for other language codes
}

interface Translations {
  eng?: string;
  por?: string;
  [key: string]: string | undefined; // Allow for other language codes
}

interface TVDBSearchResult {
  objectID: string;
  country: string;
  id: string;
  image_url: string;
  name: string;
  first_air_time: string;
  overview: string;
  primary_language: string;
  primary_type: string;
  status: string;
  type: string;
  tvdb_id: string;
  year: string;
  slug: string;
  overviews: Overviews;
  translations: Translations;
  network: string;
  remote_ids: RemoteId[];
  thumbnail: string;
}

class TVDBService {
  private static baseUrl = "https://api4.thetvdb.com/v4";
  private static token: string | null = null;
  private static tokenExpiry: number = 0;

  private static async getAuthToken(): Promise<string | null> {
    // Check if we have a valid token
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const apiKey = process.env.NEXT_PUBLIC_TVDB_API_KEY;
    if (!apiKey) {
      throw new Error("TVDB API key not configured");
    }

    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apikey: apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`TVDB auth failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.token = data.data.token;
      // Token is valid for 24 hours, we'll refresh after 23 hours
      this.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;

      return this.token;
    } catch (error) {
      console.error("TVDB authentication failed:", error);
      throw error;
    }
  }

  private static async makeRequest(endpoint: string): Promise<any> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error("Failed to retrieve TVDB API token");
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`TVDB API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  static async searchShows(query: string): Promise<TVDBSearchResult[]> {
    try {
      // Try searching with the exact query first
      const searchUrl = `/search?query=${encodeURIComponent(
        query
      )}&type=series&limit=10`;
      const data = await this.makeRequest(searchUrl);

      if (data.data && data.data.length > 0) {
        return data.data;
      }

      // If no results, try a broader search by removing common Portuguese words
      const cleanedQuery = query
        .replace(/\b(da|de|do|das|dos|e|o|a|os|as|um|uma|uns|umas)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanedQuery !== query && cleanedQuery.length > 2) {
        const broadSearchUrl = `/search?query=${encodeURIComponent(
          cleanedQuery
        )}&type=series&limit=10`;
        const broadData = await this.makeRequest(broadSearchUrl);

        if (broadData.data && broadData.data.length > 0) {
          return broadData.data;
        }
      }

      return [];
    } catch (error) {
      console.error("TVDB search failed:", error);
      return [];
    }
  }

  static async getShowDetails(showId: number): Promise<TVDBShow | null> {
    try {
      const data = await this.makeRequest(`/series/${showId}/extended`);

      if (data.data) {
        const show: TVDBShow = {
          id: data.data.id,
          name: data.data.name,
          slug: data.data.slug,
          overview: data.data.overview,
          firstAired: data.data.firstAired,
          network: data.data.latestNetwork?.name,
          status: data.data.status?.name,
          image: data.data.image,
          genres: data.data.genres?.map((g: any) => g.name) || [],
          rating: data.data.averageRating,
        };

        return show;
      }

      return null;
    } catch (error) {
      console.error("Failed to get show details:", error);
      return null;
    }
  }

  static async getEpisodeDetails(
    showId: number,
    season: number,
    episode: number
  ): Promise<TVDBEpisode | null> {
    try {
      // Get all episodes for the series
      const data = await this.makeRequest(`/series/${showId}/episodes/default`);

      if (data.data && data.data.episodes) {
        const targetEpisode = data.data.episodes.find(
          (ep: any) => ep.seasonNumber === season && ep.number === episode
        );

        if (targetEpisode) {
          const episode: TVDBEpisode = {
            id: targetEpisode.id,
            name: targetEpisode.name,
            overview: targetEpisode.overview,
            aired: targetEpisode.aired,
            seasonNumber: targetEpisode.seasonNumber,
            number: targetEpisode.number,
            runtime: targetEpisode.runtime,
            image: targetEpisode.image,
          };

          return episode;
        }
      }

      return null;
    } catch (error) {
      console.error("Failed to get episode details:", error);
      return null;
    }
  }

  static async getAllEpisodes(showId: number): Promise<TVDBEpisode[]> {
    try {
      const episodes: TVDBEpisode[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const data = await this.makeRequest(`/series/${showId}/episodes/default?page=${page}`);

        if (data.data && data.data.episodes) {
          const pageEpisodes = data.data.episodes
            .filter((ep: any) => ep.seasonNumber > 0) // Filter out specials (season 0)
            .map((ep: any) => ({
              id: ep.id,
              name: ep.name,
              overview: ep.overview,
              aired: ep.aired,
              seasonNumber: ep.seasonNumber,
              number: ep.number,
              runtime: ep.runtime,
              image: ep.image,
            }));

          episodes.push(...pageEpisodes);

          // Check if there are more pages
          hasMore = data.data.episodes.length > 0 && page < 10; // Safety limit
          page++;
        } else {
          hasMore = false;
        }
      }

      // Sort episodes by season and episode number
      return episodes.sort((a, b) => {
        if (a.seasonNumber !== b.seasonNumber) {
          return (a.seasonNumber || 0) - (b.seasonNumber || 0);
        }
        return (a.number || 0) - (b.number || 0);
      });
    } catch (error) {
      console.error("Failed to get all episodes:", error);
      return [];
    }
  }

  static async findBestMatch(showName: string): Promise<{
    show: TVDBShow | null;
    confidence: number;
  }> {
    try {
      const searchResults = await this.searchShows(showName);

      if (searchResults.length === 0) {
        return { show: null, confidence: 0 };
      }

      // Find the best match based on name similarity
      let bestMatch = searchResults[0];
      let bestScore = 0;

      for (const result of searchResults) {
        const score = this.calculateSimilarity(
          showName.toLowerCase(),
          result.name.toLowerCase()
        );
        if (score > bestScore) {
          bestScore = score;
          bestMatch = result;
        }
      }

      // Get full details for the best match
      if (bestScore > 0.6) {
        // Only if we have a good confidence match
        const showDetails = await this.getShowDetails(
          parseInt(bestMatch.objectID)
        );
        return {
          show: showDetails,
          confidence: bestScore,
        };
      }

      return { show: null, confidence: bestScore };
    } catch (error) {
      console.error("Error finding best match:", error);
      return { show: null, confidence: 0 };
    }
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation using Levenshtein distance
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export default TVDBService;
export type { TVDBSearchResult };
