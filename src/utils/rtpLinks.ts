import type { RtpLink } from "@/types/database";

export interface ResolvedRtpLink {
  url: string;
  /** "Ver no RTP" for a lone link, "Ver no RTP · T2" when a show has several. */
  label: string;
}

/**
 * Turn a show's stored `rtp_links` into the links to render. Sorted by season,
 * and only season-labelled when there's more than one (a single link needs no
 * "· T1" qualifier). Returns [] when there are none — callers can then fall back
 * to the legacy `watch_url`.
 */
export function resolveRtpLinks(rtpLinks?: RtpLink[]): ResolvedRtpLink[] {
  const links = (rtpLinks ?? []).filter((l) => l && l.url);
  const sorted = [...links].sort((a, b) => (a.season ?? 0) - (b.season ?? 0));
  const labelSeason = sorted.length > 1;
  return sorted.map((l) => ({
    url: l.url,
    label: labelSeason && l.season != null ? `Ver no RTP · T${l.season}` : "Ver no RTP",
  }));
}
