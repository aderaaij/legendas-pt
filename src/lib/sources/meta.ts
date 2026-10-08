/**
 * Streaming sources we can import series from, and what each implies. UI-safe
 * (no scraper code): the importer UI, watch links and the server all use it to
 * recognise a URL. The scrapers themselves live in `./index.ts`.
 */
import type { TargetLanguage } from "@/lib/i18n/languages";

export type SeriesSourceId = "rtp" | "rtve";

export interface SeriesSourceMeta {
  id: SeriesSourceId;
  /** Broadcaster name shown to users ("Ver no RTP", "Ver en RTVE"). */
  label: string;
  /** The language its subtitles are in; imported shows get this language. */
  language: TargetLanguage;
  /** Example series URL for input placeholders and error messages. */
  exampleUrl: string;
  hostPattern: RegExp;
}

export const SERIES_SOURCES: Record<SeriesSourceId, SeriesSourceMeta> = {
  rtp: {
    id: "rtp",
    label: "RTP",
    language: "pt",
    exampleUrl: "https://www.rtp.pt/play/p14147/o-americano",
    hostPattern: /(^|\.)rtp\.pt$/i,
  },
  rtve: {
    id: "rtve",
    label: "RTVE",
    language: "es",
    exampleUrl: "https://www.rtve.es/play/videos/el-ministerio-del-tiempo/",
    hostPattern: /(^|\.)rtve\.es$/i,
  },
};

/** Which source a URL belongs to, by hostname; null for anything else. */
export function sourceIdForUrl(url: string): SeriesSourceId | null {
  let host: string;
  try {
    host = new URL(url.trim()).hostname;
  } catch {
    return null;
  }
  const match = Object.values(SERIES_SOURCES).find((s) =>
    s.hostPattern.test(host)
  );
  return match?.id ?? null;
}
