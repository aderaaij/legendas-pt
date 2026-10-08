import type {
  ScrapedSubtitle,
  SourceEpisode,
  SourceSeries,
} from "@/types/series-source";
import type { SeriesSourceMeta } from "./meta";

export interface ScrapeSeriesOptions {
  /** Season to list, for sources whose programs span several (RTVE). */
  seasonId?: string | null;
}

/**
 * A streaming service we import subtitled series from. Implementations are
 * framework-free (plain `fetch`) so the Next routes and the worker share them.
 */
export interface SeriesSource {
  meta: SeriesSourceMeta;
  /** Whether `url` is a series or episode page this source can import. */
  isValidUrl(url: string): boolean;
  /**
   * List the program's episodes (one season's worth); null on failure. The
   * returned `url` is the canonical program page, used for watch links.
   */
  scrapeSeries(
    url: string,
    options?: ScrapeSeriesOptions
  ): Promise<SourceSeries | null>;
  /** Download the episode's subtitle in the source's language; null if none. */
  scrapeEpisodeSubtitle(episode: SourceEpisode): Promise<ScrapedSubtitle | null>;
}
