import type { RtpLink } from "@/types/database";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { SERIES_SOURCES, sourceIdForUrl } from "@/lib/sources/meta";

export interface ResolvedWatchLink {
  url: string;
  /** "Ver no RTP" for a lone link, "Ver no RTP · T2" when a show has several. */
  label: string;
}

/**
 * Turn a show's stored broadcaster links (`rtp_links` — the column predates
 * RTVE but holds links for any source) into the links to render, labelled in
 * the UI language. Sorted by season and deduplicated by URL (RTVE seasons share
 * one program page, RTP gives each season its own), and only season-labelled
 * when there's more than one (a single link needs no "· T1" qualifier). Returns
 * [] when there are none — callers can then fall back to the legacy `watch_url`.
 */
export function resolveWatchLinks(
  links: RtpLink[] | undefined,
  t: Dictionary["watch"]
): ResolvedWatchLink[] {
  const valid = (links ?? []).filter((l) => l && l.url);
  const sorted = [...valid]
    .sort((a, b) => (a.season ?? 0) - (b.season ?? 0))
    .filter((l, i, all) => all.findIndex((o) => o.url === l.url) === i);
  const labelSeason = sorted.length > 1;
  return sorted.map((l) => {
    const sourceId = sourceIdForUrl(l.url);
    const broadcaster = sourceId ? SERIES_SOURCES[sourceId].label : null;
    if (!broadcaster) return { url: l.url, label: t.original };
    return {
      url: l.url,
      label:
        labelSeason && l.season != null
          ? t.onSeason(broadcaster, l.season)
          : t.on(broadcaster),
    };
  });
}
