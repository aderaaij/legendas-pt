import type { SeriesSourceId } from "@/lib/sources/meta";

/** One episode on a streaming source's program page (RTP Play, RTVE Play). */
export interface SourceEpisode {
  /** The source's own episode id (RTP "e812786", RTVE video id "17254833"). */
  id: string;
  url: string;
  title: string;
  episodeNumber: number;
  /** ISO date (YYYY-MM-DD) when parseable, else the source's raw string. */
  airDate: string;
}

/** A season a source groups its episodes under (RTVE programs span several). */
export interface SourceSeason {
  id: string;
  /** Display label, e.g. "Temporada 5" or "Especiales". */
  label: string;
  /** Season number when the label carries one; undefined for specials. */
  number?: number;
  episodeCount?: number;
}

export interface SourceSeries {
  source: SeriesSourceId;
  id: string;
  title: string;
  /** Canonical program page URL (used for the show's watch links). */
  url: string;
  episodes: SourceEpisode[];
  // Season of `episodes`: parsed from the RTP page title ("…, temporada 2") or
  // the chosen RTVE season; undefined when unknown (treated as season 1).
  season?: number;
  /** All seasons of the program, when the source has several (RTVE). */
  seasons?: SourceSeason[];
  /** Which of `seasons` the `episodes` belong to. */
  seasonId?: string;
}

export interface SeriesPreviewResponse {
  success: boolean;
  series: SourceSeries;
}

export interface ScrapedSubtitle {
  episode: SourceEpisode;
  content: string;
  filename: string;
}
