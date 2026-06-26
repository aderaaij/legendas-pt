import type { RTPEpisode, RTPSeries, ScrapedSubtitle } from "@/types/rtp";

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

      const season = this.getSeasonFromTitle(title);

      const episodes = this.extractEpisodes(html, seriesId, seriesSlug);
      const seen = new Set(episodes.map((ep) => ep.id));

      // RTP only renders the first page of episodes (~12-16) in the initial
      // HTML; the rest are lazy-loaded via GET /play/bg_l_ep/, paged by a
      // `stamp` cursor (the last episode's `last_id`) and the NUMERIC program id
      // (e.g. 10551, not p10551). Follow the cursor until a page returns nothing.
      const numericProgramId = seriesId.replace(/^p/, "");
      let stamp = this.extractLastId(html);
      for (let page = 2; stamp && page <= 50; page++) {
        let fragment: string;
        try {
          const params = new URLSearchParams({
            stamp,
            listProgram: numericProgramId,
            page: String(page),
            type: "all",
          });
          const res = await fetch(`${this.BASE_URL}/play/bg_l_ep/?${params.toString()}`, {
            headers: { Referer: seriesUrl },
          });
          if (!res.ok) break;
          fragment = await res.text();
        } catch (paginationError) {
          console.error("Error paging RTP episodes:", paginationError);
          break;
        }

        const more = this.extractEpisodes(fragment, seriesId, seriesSlug).filter(
          (ep) => !seen.has(ep.id)
        );
        if (more.length === 0) break;
        for (const ep of more) {
          seen.add(ep.id);
          episodes.push(ep);
        }

        const nextStamp = this.extractLastId(fragment);
        if (!nextStamp || nextStamp === stamp) break;
        stamp = nextStamp;
      }

      episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

      return {
        id: seriesId,
        title,
        url: seriesUrl,
        episodes,
        season,
      };
    } catch (error) {
      console.error("Error scraping RTP series:", error);
      return null;
    }
  }

  // The `last_id` cursor RTP uses to page additional episodes; the last one in
  // a chunk of HTML points past the most recently rendered episode.
  private static extractLastId(html: string): string | null {
    const matches = [...html.matchAll(/last_id[^>]*>(\d+)</g)];
    return matches.length ? matches[matches.length - 1][1] : null;
  }

  // RTP series pages are titled e.g. "Pôr do Sol, temporada 2 - RTP Play". Pull
  // the season number out so episodes land in the right season; undefined when
  // there's no marker (callers default to season 1).
  static getSeasonFromTitle(title: string): number | undefined {
    const match = title.match(
      /\b(?:temporada|temp\.?|s[ée]rie|season)\s*(\d+)/i
    );
    return match ? parseInt(match[1], 10) : undefined;
  }

  private static extractEpisodes(
    html: string,
    seriesId: string,
    seriesSlug: string
  ): RTPEpisode[] {
    const episodes: RTPEpisode[] = [];

    // Look for episode articles within the HTML structure
    // Episodes 1-12: <article class="col-xs-12 col-sm-4 col-md-3 episode-article">
    // Episodes 13-16: <article class="col-xs-6 col-sm-4 col-md-3 episode-article">
    const episodeArticleRegex =
      /<article[^>]*class="[^"]*episode-article[^"]*"[^>]*>([\s\S]*?)<\/article>/g;

    let articleMatch;
    while ((articleMatch = episodeArticleRegex.exec(html)) !== null) {
      const articleContent = articleMatch[1];

      // Extract episode ID and URL from the <a> tag - use more flexible pattern
      const linkMatch =
        articleContent.match(
          /<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*title="([^"]*)"[^>]*class="episode-item[^"]*"[^>]*>/
        ) ||
        articleContent.match(
          /<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*class="episode-item[^"]*"[^>]*title="([^"]*)"[^>]*>/
        ) ||
        articleContent.match(/<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*>/);

      if (!linkMatch) {
        continue;
      }

      const episodeId = linkMatch[1];
      const linkTitle = linkMatch[2] || "";

      // Extract episode number from the content
      const episodeNumberMatch = articleContent.match(
        /<div class="episode">Ep\.\s*(\d+)<\/div>/
      );
      if (!episodeNumberMatch) {
        continue;
      }
      const episodeNumber = parseInt(episodeNumberMatch[1]);

      // Extract date from meta content if available
      const metaContentMatch = articleContent.match(
        /<meta content="[^"]*Ep\.\s*\d+\s*([^"]+)"/
      );
      const airDate = metaContentMatch ? metaContentMatch[1].trim() : "";

      // Use link title for episode title, fallback to generic title
      // Convert series slug to expected title format (e.g., "por-do-sol" -> "Pôr do Sol")
      const expectedShowName = seriesSlug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      const expectedGenericTitle = `Aceder a ${expectedShowName}`;

      const title =
        linkTitle && linkTitle !== expectedGenericTitle
          ? linkTitle.replace(/^Aceder a\s+/, "").trim()
          : `Episode ${episodeNumber}`;

      const parsedDate = this.parsePortugueseDate(airDate);

      episodes.push({
        id: episodeId,
        url: `${this.BASE_URL}/play/${seriesId}/${episodeId}/${seriesSlug}`,
        title: title,
        episodeNumber: episodeNumber,
        airDate: parsedDate || airDate,
      });
    }

    // Second try: If we didn't get enough episodes, try a broader approach
    if (episodes.length < 10) {
      // Assume most series have at least 10 episodes

      // Look for any links to episodes, regardless of surrounding HTML structure
      const broadEpisodeRegex =
        /<a[^>]*href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
      const foundEpisodeIds = new Set(episodes.map((ep) => ep.id));

      let broadMatch;
      while ((broadMatch = broadEpisodeRegex.exec(html)) !== null) {
        const episodeId = broadMatch[1];
        const episodeContent = broadMatch[2];

        // Skip if we already found this episode
        if (foundEpisodeIds.has(episodeId)) continue;

        // Look for episode number in the content
        const episodeNumberMatch =
          episodeContent.match(/Ep\.\s*(\d+)/) ||
          episodeContent.match(/Episode\s+(\d+)/i) ||
          episodeContent.match(/(\d+)/);

        if (episodeNumberMatch) {
          const episodeNumber = parseInt(episodeNumberMatch[1]);

          // Basic validation - episode numbers should be reasonable
          if (episodeNumber > 0 && episodeNumber < 100) {
            const title = `Episode ${episodeNumber}`;

            episodes.push({
              id: episodeId,
              url: `${this.BASE_URL}/play/${seriesId}/${episodeId}/${seriesSlug}`,
              title: title,
              episodeNumber: episodeNumber,
              airDate: "",
            });
          }
        }
      }
    }

    const sortedEpisodes = episodes.sort(
      (a, b) => a.episodeNumber - b.episodeNumber
    );

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

      let subtitleUrl = null;

      // Look for RTPPlayer initialization with vtt configuration
      // Pattern: var player1 = new RTPPlayer({ ... vtt: [['PT','Português adaptado','https://...vtt']] ... });

      const rtpPlayerRegex = /new\s+RTPPlayer\s*\(\s*\{([\s\S]*?)\}\s*\)\s*;/;
      const rtpPlayerMatch = html.match(rtpPlayerRegex);

      if (rtpPlayerMatch) {
        const playerConfig = rtpPlayerMatch[1];

        // Extract the vtt array from the player configuration
        // vtt: [['PT','Português adaptado','https://cdn-ondemand.rtp.pt/nas2.share/legendas/video/web/p14147/p14147_1_20250120163227e008t6122d.vtt']]
        const vttRegex =
          /vtt:\s*\[\s*\[\s*['"]PT['"],\s*['"][^'"]*['"],\s*['"]([^'"]+\.vtt)['"][^\]]*\]\s*\]/;
        const vttMatch = playerConfig.match(vttRegex);

        if (vttMatch) {
          subtitleUrl = vttMatch[1];
        } else {
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
        const vttUrlRegex =
          /(https:\/\/cdn-ondemand\.rtp\.pt\/nas2\.share\/legendas\/video\/web\/p\d+\/[^"'\s]+\.vtt)/;
        const vttUrlMatch = html.match(vttUrlRegex);
        if (vttUrlMatch) {
          subtitleUrl = vttUrlMatch[1];
        }
      }

      if (!subtitleUrl) {
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
