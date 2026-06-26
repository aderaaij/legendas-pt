import Link from "next/link";
import { Play, ExternalLink } from "lucide-react";

import { LibraryShow } from "@/lib/supabase";
import { generateShowSlug } from "@/utils/slugify";
import { yearFrom } from "@/utils/posterGradient";
import { resolveRtpLinks } from "@/utils/rtpLinks";
import { PosterArt } from "./PosterArt";

interface HeroSectionProps {
  show: LibraryShow;
}

export function HeroSection({ show }: HeroSectionProps) {
  const slug = generateShowSlug(show.name);
  const channel = show.network || show.source;
  const year = yearFrom(show.first_aired);
  const blurb = show.overview || show.description;
  const rtpLinks = resolveRtpLinks(show.rtp_links);

  return (
    <section className="relative flex min-h-[540px] items-end overflow-hidden px-5 pb-13 md:px-10">
      {/* Backdrop */}
      <div className="absolute inset-0">
        <PosterArt name={show.name} posterUrl={show.poster_url} priority sizes="100vw" />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(8,8,10,.92) 0%, rgba(8,8,10,.62) 38%, rgba(8,8,10,.15) 70%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, var(--bg) 2%, rgba(10,10,12,.4) 22%, transparent 55%)",
        }}
      />

      <div className="relative max-w-[640px] pt-24">
        <div className="mb-[18px] flex items-center gap-[10px]">
          <span
            className="text-[11px] font-extrabold uppercase tracking-[0.18em]"
            style={{ color: "var(--accent2)" }}
          >
            Em destaque
          </span>
          <span className="h-1 w-1 rounded-full" style={{ background: "var(--faint)" }} />
          <span className="text-[12.5px] font-semibold" style={{ color: "var(--muted)" }}>
            {channel}
            {year ? ` · ${year}` : ""}
          </span>
        </div>

        <h1
          className="font-display mb-[18px] text-[52px] uppercase leading-[0.92] tracking-[0.01em] md:text-[74px]"
          style={{ textShadow: "0 4px 30px rgba(0,0,0,.6)" }}
        >
          {show.name}
        </h1>

        {blurb && (
          <p
            className="mb-6 max-w-[540px] text-[15.5px] leading-[1.6]"
            style={{ color: "#d6d6dc" }}
          >
            {blurb}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-[14px]">
          <Link
            href={`/${slug}`}
            className="flex items-center gap-[9px] rounded-lg px-[26px] py-[13px] text-[15px] font-bold text-white"
            style={{
              background: "var(--accent)",
              boxShadow: "0 10px 28px -8px var(--accent)",
            }}
          >
            <Play className="h-[17px] w-[17px]" fill="currentColor" />
            Estudar agora
          </Link>

          {rtpLinks.length > 0
            ? rtpLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-[9px] rounded-lg px-6 py-[13px] text-[15px] font-semibold backdrop-blur-sm"
                  style={{
                    border: "1px solid var(--border2)",
                    background: "rgba(255,255,255,.07)",
                    color: "var(--text)",
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  {link.label}
                </a>
              ))
            : show.watch_url && (
                <a
                  href={show.watch_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-[9px] rounded-lg px-6 py-[13px] text-[15px] font-semibold backdrop-blur-sm"
                  style={{
                    border: "1px solid var(--border2)",
                    background: "rgba(255,255,255,.07)",
                    color: "var(--text)",
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver original
                </a>
              )}

          <div className="ml-2 flex gap-[22px]">
            <div>
              <div className="font-display text-[22px]">{show.totalPhrases}</div>
              <div className="text-[11px] tracking-[0.04em]" style={{ color: "var(--muted)" }}>
                frases
              </div>
            </div>
            <div>
              <div className="font-display text-[22px]">{show.extractionCount}</div>
              <div className="text-[11px] tracking-[0.04em]" style={{ color: "var(--muted)" }}>
                {show.extractionCount === 1 ? "extração" : "extrações"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
