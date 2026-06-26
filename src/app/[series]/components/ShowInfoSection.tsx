import Link from "next/link";
import { Play, Pencil } from "lucide-react";

import { Show } from "@/lib/supabase";
import {
  generateShowSlug,
  episodeSlugPart,
} from "@/utils/slugify";
import { yearFrom } from "@/utils/posterGradient";
import { resolveRtpLinks } from "@/utils/rtpLinks";
import { useAuth } from "@/contexts/AuthContext";
import { PosterArt } from "@/app/components/home/PosterArt";
import { EpisodeWithStats } from "./SeriesPageClient";

interface ShowInfoSectionProps {
  show: Show;
  episodes: EpisodeWithStats[];
}

export const ShowInfoSection = ({ show, episodes }: ShowInfoSectionProps) => {
  const { isAdmin } = useAuth();
  const slug = generateShowSlug(show.name);
  const year = yearFrom(show.first_aired);
  const genre =
    show.genres && show.genres.length ? show.genres.join(", ") : show.genre;
  const blurb = show.overview || show.description;
  const rtpLinks = resolveRtpLinks(show.rtp_links);

  const firstEpisode = [...episodes].sort(
    (a, b) =>
      (a.season ?? 0) - (b.season ?? 0) ||
      (a.episode_number ?? 0) - (b.episode_number ?? 0)
  )[0];

  return (
    <section className="relative -mt-[68px] flex min-h-[480px] items-end overflow-hidden px-5 pb-11 md:px-10">
      <div className="absolute inset-0">
        <PosterArt name={show.name} posterUrl={show.poster_url} priority sizes="100vw" />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(8,8,10,.9) 0%, rgba(8,8,10,.5) 45%, rgba(8,8,10,.2) 80%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, var(--bg) 1%, rgba(10,10,12,.35) 24%, transparent 58%)",
        }}
      />

      <div className="relative flex w-full items-end gap-[30px] pt-24">
        {/* Poster */}
        <div
          className="relative hidden w-[188px] shrink-0 overflow-hidden rounded-[var(--radius)] sm:block"
          style={{
            aspectRatio: "2 / 3",
            border: "1px solid var(--border2)",
            boxShadow: "var(--shadow)",
          }}
        >
          <PosterArt name={show.name} posterUrl={show.poster_url} sizes="188px" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(0deg, rgba(0,0,0,.6), transparent 55%)" }}
          />
          <div className="font-display absolute inset-x-[13px] bottom-[13px] text-[19px] uppercase leading-[0.95]">
            {show.name}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 pb-[6px]">
          <div className="mb-[14px] text-[12.5px]" style={{ color: "var(--muted)" }}>
            <Link href="/" style={{ color: "var(--accent2)" }}>
              Biblioteca
            </Link>
            <span> &nbsp;/&nbsp; {show.name}</span>
          </div>

          <h1 className="font-display mb-[14px] text-[40px] uppercase leading-[0.92] md:text-[56px]">
            {show.name}
          </h1>

          <div
            className="mb-4 flex flex-wrap items-center gap-3 text-[13px]"
            style={{ color: "var(--muted)" }}
          >
            <span className="font-bold" style={{ color: "var(--green)" }}>
              {episodes.length} {episodes.length === 1 ? "episódio" : "episódios"}
            </span>
            {year && (
              <>
                <span className="h-[3px] w-[3px] rounded-full" style={{ background: "var(--faint)" }} />
                <span>Estreia {year}</span>
              </>
            )}
            {genre && (
              <>
                <span className="h-[3px] w-[3px] rounded-full" style={{ background: "var(--faint)" }} />
                <span>{genre}</span>
              </>
            )}
          </div>

          {blurb && (
            <p
              className="mb-5 max-w-[680px] text-[14.5px] leading-[1.6]"
              style={{ color: "#d2d2da" }}
            >
              {blurb}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {firstEpisode && (
              <Link
                href={`/${slug}/${episodeSlugPart(
                  firstEpisode.season,
                  firstEpisode.episode_number
                )}`}
                className="flex items-center gap-[9px] rounded-lg px-6 py-3 text-[14.5px] font-bold text-white"
                style={{
                  background: "var(--accent)",
                  boxShadow: "0 10px 28px -8px var(--accent)",
                }}
              >
                <Play className="h-4 w-4" fill="currentColor" />
                Estudar primeiro episódio
              </Link>
            )}

            {isAdmin && (
              <Link
                href={`/${slug}/edit`}
                className="flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold"
                style={{
                  border: "1px solid var(--border2)",
                  background: "rgba(255,255,255,.06)",
                  color: "var(--text)",
                }}
              >
                <Pencil className="h-[15px] w-[15px]" />
                Editar
              </Link>
            )}

            {rtpLinks.length > 0
              ? rtpLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-[7px] px-1 py-3 text-sm font-semibold"
                    style={{ color: "var(--muted)" }}
                  >
                    {link.label} →
                  </a>
                ))
              : show.watch_url && (
                  <a
                    href={show.watch_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-[7px] px-1 py-3 text-sm font-semibold"
                    style={{ color: "var(--muted)" }}
                  >
                    Ver original →
                  </a>
                )}
          </div>
        </div>
      </div>
    </section>
  );
};
