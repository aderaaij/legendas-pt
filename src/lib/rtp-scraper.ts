interface RTPEpisode {
  id: string;
  url: string;
  title: string;
  episodeNumber: number;
  airDate: string;
  subtitleUrl?: string;
}

interface RTPSeries {
  id: string;
  title: string;
  url: string;
  episodes: RTPEpisode[];
}

interface ScrapedSubtitle {
  episode: RTPEpisode;
  content: string;
  filename: string;
}

class RTPScraperService {
  private static readonly BASE_URL = "https://www.rtp.pt";

  private static parsePortugueseDate(dateStr: string): string | null {
    if (!dateStr) return null;

    const monthMap: Record<string, string> = {
      jan: "01",
      fev: "02",
      mar: "03",
      abr: "04",
      mai: "05",
      jun: "06",
      jul: "07",
      ago: "08",
      set: "09",
      out: "10",
      nov: "11",
      dez: "12",
    };

    // Parse format: "02 dez. 2024"
    const match = dateStr.match(/(\d{1,2})\s+(\w{3})\.?\s+(\d{4})/);
    if (!match) return null;

    const [, day, monthAbbr, year] = match;
    const month = monthMap[monthAbbr.toLowerCase()];

    if (!month) return null;

    // Return ISO format: YYYY-MM-DD
    return `${year}-${month}-${day.padStart(2, "0")}`;
  }

  static async scrapeSeries(seriesUrl: string): Promise<RTPSeries | null> {
    try {
      const response = await fetch(seriesUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch series page: ${response.statusText}`);
      }

      const html = await response.text();

      // Extract series ID and slug from URL (e.g., p14147 and o-americano from /play/p14147/o-americano)
      const seriesUrlMatch = seriesUrl.match(/\/play\/(p\d+)\/([^\/]+)/);
      if (!seriesUrlMatch) {
        throw new Error("Invalid RTP series URL format");
      }

      const seriesId = seriesUrlMatch[1];
      const seriesSlug = seriesUrlMatch[2];

      // Extract series title
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const title = titleMatch
        ? titleMatch[1].replace(" - RTP Play", "").trim()
        : "Unknown Series";

      // Extract episodes from the HTML
      console.log(
        "HTML snippet around episodes:",
        html.substring(html.indexOf("Ep."), html.indexOf("Ep.") + 500)
      );
      const episodes = this.extractEpisodes(html, seriesId, seriesSlug);

      return {
        id: seriesId,
        title,
        url: seriesUrl,
        episodes,
      };
    } catch (error) {
      console.error("Error scraping RTP series:", error);
      return null;
    }
  }

  private static extractEpisodes(
    html: string,
    seriesId: string,
    seriesSlug: string
  ): RTPEpisode[] {
    const episodes: RTPEpisode[] = [];

    // Parse the specific HTML structure for episode items
    // Look for complete episode blocks: <a href="/play/p14147/e812786/o-americano" ... episode data ... </a>
    const episodeBlockRegex =
      /<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*class="episode-item[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

    let blockMatch;
    while ((blockMatch = episodeBlockRegex.exec(html)) !== null) {
      const episodeId = blockMatch[1];
      const episodeContent = blockMatch[2];

      // Extract episode number from the content
      const episodeNumberMatch = episodeContent.match(
        /<div class="episode">Ep\.\s*(\d+)<\/div>/
      );
      if (!episodeNumberMatch) continue;
      const episodeNumber = parseInt(episodeNumberMatch[1]);

      // Extract episode date
      const episodeDateMatch = episodeContent.match(
        /<div class="episode-date">([^<]+)<\/div>/
      );
      const airDate = episodeDateMatch ? episodeDateMatch[1].trim() : "";

      // Extract episode title
      const episodeTitleMatch = episodeContent.match(
        /<p class="episode-title">\s*([^<]+)\s*<\/p>/
      );
      const title = episodeTitleMatch
        ? episodeTitleMatch[1].trim()
        : `Episode ${episodeNumber}`;

      const parsedDate = this.parsePortugueseDate(airDate);
      console.log(
        `Found episode ${episodeNumber}: "${title}" (${airDate} -> ${parsedDate}) [${episodeId}]`
      );

      episodes.push({
        id: episodeId,
        url: `${this.BASE_URL}/play/${seriesId}/${episodeId}/${seriesSlug}`,
        title: title,
        episodeNumber: episodeNumber,
        airDate: parsedDate || airDate,
      });
    }

    const sortedEpisodes = episodes.sort(
      (a, b) => a.episodeNumber - b.episodeNumber
    );
    console.log("Final episodes found:", sortedEpisodes.length);
    console.log(
      "Episodes:",
      sortedEpisodes.map(
        (e) => `Ep.${e.episodeNumber}: "${e.title}" (RTP ID: ${e.id})`
      )
    );
    console.log("Full episode data:", JSON.stringify(sortedEpisodes, null, 2));

    return sortedEpisodes;
  }

  static async scrapeEpisodeSubtitle(
    episode: RTPEpisode
  ): Promise<ScrapedSubtitle | null> {
    try {
      const response = await fetch(episode.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch episode page: ${response.statusText}`);
      }

      const html = await response.text();

      console.log(`Searching for subtitles in episode ${episode.id}...`);
      console.log(`Episode URL: ${episode.url}`);
      console.log(`Episode title: ${episode.title}`);
      // console.log(html);
      let subtitleUrl = null;

      // Look for RTPPlayer initialization with vtt configuration
      // Pattern: var player1 = new RTPPlayer({ ... vtt: [['PT','Português adaptado','https://...vtt']] ... });
      console.log("Looking for RTPPlayer initialization...");

      const rtpPlayerRegex = /new\s+RTPPlayer\s*\(\s*\{([\s\S]*?)\}\s*\)\s*;/;
      const rtpPlayerMatch = html.match(rtpPlayerRegex);

      if (rtpPlayerMatch) {
        const playerConfig = rtpPlayerMatch[1];
        console.log("Found RTPPlayer configuration");

        // Extract the vtt array from the player configuration
        // vtt: [['PT','Português adaptado','https://cdn-ondemand.rtp.pt/nas2.share/legendas/video/web/p14147/p14147_1_20250120163227e008t6122d.vtt']]
        const vttRegex =
          /vtt:\s*\[\s*\[\s*['"]PT['"],\s*['"][^'"]*['"],\s*['"]([^'"]+\.vtt)['"][^\]]*\]\s*\]/;
        const vttMatch = playerConfig.match(vttRegex);

        if (vttMatch) {
          subtitleUrl = vttMatch[1];
          console.log(`Found subtitle URL in RTPPlayer config: ${subtitleUrl}`);
        } else {
          console.log("No vtt configuration found in RTPPlayer");

          // Debug: show what the vtt section looks like
          const vttSectionRegex = /vtt:\s*\[[^\]]+\]/;
          const vttSection = playerConfig.match(vttSectionRegex);
          if (vttSection) {
            console.log("VTT section found but not parsed:", vttSection[0]);
          } else {
            console.log("No vtt section found at all");
          }
        }
      } else {
        console.log("No RTPPlayer initialization found");
      }

      // Fallback: Look for any VTT URLs in the HTML as a backup
      if (!subtitleUrl) {
        console.log("Fallback: Looking for any VTT URLs...");
        const vttUrlRegex =
          /(https:\/\/cdn-ondemand\.rtp\.pt\/nas2\.share\/legendas\/video\/web\/p\d+\/[^"'\s]+\.vtt)/;
        const vttUrlMatch = html.match(vttUrlRegex);
        if (vttUrlMatch) {
          subtitleUrl = vttUrlMatch[1];
          console.log(`Found subtitle URL via fallback: ${subtitleUrl}`);
        } else {
          console.log("No VTT URLs found in fallback search");
        }
      }

      if (!subtitleUrl) {
        console.warn(`No subtitle found for episode ${episode.id}`);
        console.log("=== DEBUGGING SUBTITLE SEARCH FAILURE ===");
        console.log("Episode details:", {
          id: episode.id,
          title: episode.title,
          url: episode.url,
        });
        console.log(
          'HTML contains "RTPPlayer":',
          html.includes("RTPPlayer") ? "YES" : "NO"
        );
        console.log(
          'HTML contains "vtt":',
          html.includes("vtt") ? "YES" : "NO"
        );

        // Show a snippet around RTPPlayer if it exists
        const rtpPlayerIndex = html.indexOf("RTPPlayer");
        if (rtpPlayerIndex !== -1) {
          const start = Math.max(0, rtpPlayerIndex - 100);
          const end = Math.min(html.length, rtpPlayerIndex + 500);
          console.log("RTPPlayer context:", html.substring(start, end));
        }

        console.log("=== END DEBUGGING ===");
        return null;
      }

      // Download the subtitle content
      const subtitleResponse = await fetch(subtitleUrl);
      if (!subtitleResponse.ok) {
        throw new Error(
          `Failed to download subtitle: ${subtitleResponse.statusText}`
        );
      }

      const subtitleContent = await subtitleResponse.text();

      // Generate filename similar to existing format
      const filename = `${episode.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}-s01e${episode.episodeNumber
        .toString()
        .padStart(2, "0")}.vtt`;

      return {
        episode,
        content: subtitleContent,
        filename,
      };
    } catch (error) {
      console.error(
        `Error scraping subtitle for episode ${episode.id}:`,
        error
      );
      return null;
    }
  }

  static async scrapeAllSubtitles(
    seriesUrl: string
  ): Promise<ScrapedSubtitle[]> {
    const series = await this.scrapeSeries(seriesUrl);
    if (!series) {
      throw new Error("Failed to scrape series data");
    }

    const subtitles: ScrapedSubtitle[] = [];

    // Process episodes sequentially to avoid overwhelming the server
    for (const episode of series.episodes) {
      const subtitle = await this.scrapeEpisodeSubtitle(episode);
      if (subtitle) {
        subtitles.push(subtitle);
      }

      // Add a small delay between requests to be respectful
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return subtitles;
  }

  static parseRTPUrl(url: string): {
    isValid: boolean;
    seriesId?: string;
    episodeId?: string;
  } {
    // Series URL: https://www.rtp.pt/play/p14147/o-americano
    const seriesMatch = url.match(/\/play\/(p\d+)\/[^\/]+$/);
    if (seriesMatch) {
      return {
        isValid: true,
        seriesId: seriesMatch[1],
      };
    }

    // Episode URL: https://www.rtp.pt/play/p14147/e812786/o-americano
    const episodeMatch = url.match(/\/play\/(p\d+)\/(e\d+)\//);
    if (episodeMatch) {
      return {
        isValid: true,
        seriesId: episodeMatch[1],
        episodeId: episodeMatch[2],
      };
    }

    return { isValid: false };
  }

  static normalizeSeriesName(rtpTitle: string): string {
    // Clean up RTP title for TVDB matching
    return rtpTitle
      .replace(/\s*-\s*RTP\s*Play\s*/i, "")
      .replace(/\s*\|\s*RTP\s*/i, "")
      .trim();
  }
}

export default RTPScraperService;
export type { RTPSeries, RTPEpisode, ScrapedSubtitle };
