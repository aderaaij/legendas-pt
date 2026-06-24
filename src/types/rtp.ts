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