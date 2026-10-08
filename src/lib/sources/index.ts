/**
 * Registry of streaming sources we import series from. Server-side (the
 * scrapers fetch from RTP/RTVE); UI code should use `./meta` instead.
 */
import { sourceIdForUrl, type SeriesSourceId } from "./meta";
import { rtpSource } from "./rtp";
import { rtveSource } from "./rtve";
import type { SeriesSource } from "./types";

const SOURCES: Record<SeriesSourceId, SeriesSource> = {
  rtp: rtpSource,
  rtve: rtveSource,
};

export function getSeriesSource(id: SeriesSourceId): SeriesSource {
  return SOURCES[id];
}

/** The source that can import `url`, or null if none recognises it. */
export function seriesSourceForUrl(url: string): SeriesSource | null {
  const id = sourceIdForUrl(url);
  const source = id ? SOURCES[id] : null;
  return source?.isValidUrl(url) ? source : null;
}
