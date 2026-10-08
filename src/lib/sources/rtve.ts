/**
 * RTVE Play (rtve.es) — Spanish. Unlike RTP there's a public JSON API, so no
 * HTML scraping beyond resolving a program slug to its id:
 *   /api/programas/{id}.json                         program (name, canonical URL)
 *   /api/programas/{id}/temporadas.json              seasons
 *   /api/programas/{id}/temporadas/{sid}/videos.json episodes of a season
 *   /api/videos/{id}.json                            one video (program + season)
 *   /api/videos/{id}/subtitulos.json                 VTT tracks per language
 * Programs span several seasons (a daily soap can have 900+ episodes), so a
 * series is listed one season at a time.
 */
import type {
  ScrapedSubtitle,
  SourceEpisode,
  SourceSeason,
  SourceSeries,
} from "@/types/series-source";
import { SERIES_SOURCES } from "./meta";
import type { ScrapeSeriesOptions, SeriesSource } from "./types";

const BASE_URL = "https://www.rtve.es";
const API_URL = `${BASE_URL}/api`;
/** RTVE's video type for full episodes (as opposed to clips and trailers). */
const FULL_EPISODE_TYPE = "39816";
const PAGE_SIZE = 60;
const MAX_PAGES = 30;
/** Subtitle track language to import (RTVE also ships ca/gl/eu/en tracks). */
const SUBTITLE_LANG = "es";

// /play/videos/{program}/{episode-slug}/{videoId}/ or the short /v/{videoId}/
const VIDEO_URL = /\/(?:v|videos\/[^/?#]+\/[^/?#]+)\/(\d{5,})\/?(?:[?#]|$)/;
// Short program link /pr/{programId}/
const PROGRAM_ID_URL = /\/pr\/(\d+)/;
// /play/videos/{program}/
const PROGRAM_SLUG_URL = /\/videos\/([^/?#]+)\/?(?:[?#]|$)/;

interface RtvePage<T> {
  page: { items: T[]; number: number; totalPages: number };
}

interface RtveProgram {
  id: string;
  name: string;
  htmlUrl: string;
}

interface RtveSeason {
  id: number;
  title: string;
  longTitle?: string | null;
  numEpisodes?: number | null;
}

interface RtveVideo {
  id: string;
  htmlUrl: string;
  title: string;
  episode?: number | null;
  temporadaId?: number | null;
  dateOfEmission?: string | null;
  publicationDate?: string | null;
  programInfo?: { id: string } | null;
}

interface RtveSubtitleTrack {
  src: string;
  lang: string;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`RTVE API ${path}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

async function getAllPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  const separator = path.includes("?") ? "&" : "?";
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await getJson<RtvePage<T>>(
      `${path}${separator}size=${PAGE_SIZE}&page=${page}`
    );
    items.push(...data.page.items);
    if (page >= data.page.totalPages) break;
  }
  return items;
}

function isValidUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (!SERIES_SOURCES.rtve.hostPattern.test(parsed.hostname)) return false;
  return (
    VIDEO_URL.test(parsed.pathname) ||
    PROGRAM_ID_URL.test(parsed.pathname) ||
    PROGRAM_SLUG_URL.test(parsed.pathname)
  );
}

/** "08-10-2026 18:35:00" → "2026-10-08" */
function parseRtveDate(value?: string | null): string {
  const match = value?.match(/^(\d{2})-(\d{2})-(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

/** "Temporada 5" / "T5" → 5; "Especiales" → undefined */
function seasonNumber(season: RtveSeason): number | undefined {
  const match =
    season.longTitle?.match(/temporada\s*(\d+)/i) ??
    season.title.match(/^T\s*(\d+)$/i) ??
    season.title.match(/temporada\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Resolve a program id plus, for an episode URL, the episode's season (so the
 * preview opens on the season the admin was looking at).
 */
async function resolveProgram(
  url: string
): Promise<{ programId: string; seasonId?: string }> {
  const { pathname } = new URL(url.trim());

  const videoMatch = pathname.match(VIDEO_URL);
  if (videoMatch) {
    const data = await getJson<RtvePage<RtveVideo>>(
      `/videos/${videoMatch[1]}.json`
    );
    const video = data.page.items[0];
    if (!video?.programInfo?.id) {
      throw new Error(`RTVE video ${videoMatch[1]} has no program`);
    }
    return {
      programId: video.programInfo.id,
      seasonId: video.temporadaId ? String(video.temporadaId) : undefined,
    };
  }

  const idMatch = pathname.match(PROGRAM_ID_URL);
  if (idMatch) return { programId: idMatch[1] };

  // A program slug: the page's analytics data carries the numeric id.
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch RTVE program page: ${res.statusText}`);
  }
  const html = await res.text();
  const programId =
    html.match(/"pageID":"(\d+)"/)?.[1] ??
    html.match(/rtve\.es\/pr\/(\d+)/)?.[1];
  if (!programId) {
    throw new Error("Could not find the RTVE program id on the page");
  }
  return { programId };
}

function toSourceSeason(season: RtveSeason): SourceSeason {
  return {
    id: String(season.id),
    label: season.longTitle || season.title,
    number: seasonNumber(season),
    episodeCount: season.numEpisodes ?? undefined,
  };
}

/** Default season when none was asked for: the first numbered one (T1). */
function defaultSeason(seasons: SourceSeason[]): SourceSeason | undefined {
  const numbered = seasons
    .filter((s) => s.number != null)
    .sort((a, b) => a.number! - b.number!);
  return numbered[0] ?? seasons[0];
}

function episodeNumberOf(video: RtveVideo): number | undefined {
  if (video.episode != null) return video.episode;
  const match = video.title.match(/episodio\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Map RTVE videos to episodes with unique numbers — the import keys episodes
 * by number, so a missing or repeated `episode` gets the next free number.
 */
function toSourceEpisodes(videos: RtveVideo[]): SourceEpisode[] {
  const parsed = videos
    .map((video) => ({ video, number: episodeNumberOf(video) }))
    .sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity));

  const used = new Set<number>();
  let next = Math.max(0, ...parsed.map((p) => p.number ?? 0)) + 1;
  return parsed
    .map(({ video, number }) => {
      const episodeNumber =
        number == null || used.has(number) ? next++ : number;
      used.add(episodeNumber);
      return {
        id: video.id,
        url: video.htmlUrl,
        title: video.title,
        episodeNumber,
        airDate: parseRtveDate(video.dateOfEmission ?? video.publicationDate),
      };
    })
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
}

async function scrapeSeries(
  url: string,
  options?: ScrapeSeriesOptions
): Promise<SourceSeries | null> {
  try {
    const { programId, seasonId: urlSeasonId } = await resolveProgram(url);

    const [programPage, seasonPage] = await Promise.all([
      getJson<RtvePage<RtveProgram>>(`/programas/${programId}.json`),
      getJson<RtvePage<RtveSeason>>(`/programas/${programId}/temporadas.json`),
    ]);
    const program = programPage.page.items[0];
    if (!program) throw new Error(`RTVE program ${programId} not found`);

    const seasons = seasonPage.page.items.map(toSourceSeason);
    const requestedId = options?.seasonId ?? urlSeasonId;
    const season =
      seasons.find((s) => s.id === requestedId) ?? defaultSeason(seasons);

    // Programs without seasons list their episodes directly.
    const videosPath = season
      ? `/programas/${programId}/temporadas/${season.id}/videos.json?type=${FULL_EPISODE_TYPE}`
      : `/programas/${programId}/videos.json?type=${FULL_EPISODE_TYPE}`;
    const videos = await getAllPages<RtveVideo>(videosPath);

    return {
      source: "rtve",
      id: programId,
      title: program.name,
      url: program.htmlUrl,
      episodes: toSourceEpisodes(videos),
      // An unnumbered season ("Especiales") goes to season 0, TVDB's specials.
      season: season ? (season.number ?? 0) : undefined,
      seasons,
      seasonId: season?.id,
    };
  } catch (error) {
    console.error("Error scraping RTVE series:", error);
    return null;
  }
}

/**
 * Fetch the episode's Spanish subtitle. Returns null when the episode has no
 * Spanish track; network/API failures throw so the import can retry them.
 */
async function scrapeEpisodeSubtitle(
  episode: SourceEpisode
): Promise<ScrapedSubtitle | null> {
  const tracks = await getJson<RtvePage<RtveSubtitleTrack>>(
    `/videos/${episode.id}/subtitulos.json`
  );
  const track = tracks.page.items.find((t) => t.lang === SUBTITLE_LANG);
  if (!track) return null;

  const res = await fetch(track.src);
  if (!res.ok) {
    throw new Error(`Failed to download RTVE subtitle: ${res.statusText}`);
  }
  const content = (await res.text()).replace(/^\uFEFF/, "");

  // e.g. ".../la-promesa/temporada-5-episodio-924/17254833/" →
  // "la-promesa-temporada-5-episodio-924.vtt"
  const slug = new URL(episode.url).pathname
    .split("/")
    .filter((part) => part && !["play", "videos", episode.id].includes(part))
    .join("-");

  return {
    episode,
    content,
    filename: `${slug || `rtve-${episode.id}`}.vtt`,
  };
}

export const rtveSource: SeriesSource = {
  meta: SERIES_SOURCES.rtve,
  isValidUrl,
  scrapeSeries,
  scrapeEpisodeSubtitle,
};
