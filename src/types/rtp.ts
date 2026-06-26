export interface RTPEpisode {
  id: string;
  url: string;
  title: string;
  episodeNumber: number;
  airDate: string;
  subtitleUrl?: string;
}

export interface RTPSeries {
  id: string;
  title: string;
  url: string;
  episodes: RTPEpisode[];
  // Season parsed from the RTP page title (e.g. "…, temporada 2"); undefined when
  // the title carries no season marker (treated as season 1 downstream).
  season?: number;
}

export interface RTPPreviewResponse {
  success: boolean;
  series: RTPSeries;
}

export interface ScrapedSubtitle {
  episode: RTPEpisode;
  content: string;
  filename: string;
}