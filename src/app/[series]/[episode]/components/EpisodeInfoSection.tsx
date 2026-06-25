import Link from "next/link";
import { Brain, Settings } from "lucide-react";

import { Show, Episode, ExtractedPhrase } from "@/lib/supabase";
import {
  generateShowSlug,
  episodeCode,
  episodeSlugPart,
} from "@/utils/slugify";
import { useAuth } from "@/hooks/useAuth";
import { formatDuration } from "@/utils/formatDuration";
import { formatDatePt } from "@/utils/formatDate";
import { PosterArt } from "@/app/components/home/PosterArt";

interface EpisodeInfoSectionProps {
  show: Show;
  episode: Episode;
  phrases: ExtractedPhrase[];
  onStartStudy: () => void;
}

export const EpisodeInfoSection = ({
  show,
  episode,
  phrases,
  onStartStudy,
}: EpisodeInfoSectionProps) => {
  const { isAdmin } = useAuth();
  const slug = generateShowSlug(show.name);
  const code = episodeCode(episode.season, episode.episode_number);
  const channel = show.network || show.source;
  const date = formatDatePt(episode.air_date);
  const runtime = episode.duration_minutes ?? episode.runtime;

  const tags = [
    date,
    runtime ? formatDuration(runtime) : "",
    channel,
  ].filter(Boolean);

  return (
    <section className="relative -mt-[68px] overflow-hidden px-5 pb-9 pt-[104px] md:px-10">
      <div className="absolute inset-0">
        <PosterArt
          name={show.name}
          posterUrl={episode.episode_image || show.poster_url}
          priority
          sizes="100vw"
        />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(8,8,10,.92) 0%, rgba(8,8,10,.6) 55%, rgba(8,8,10,.25) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(0deg, var(--bg) 2%, transparent 70%)" }}
      />

      <div className="relative flex items-end gap-[26px]">
        {/* Poster */}
        <div
          className="relative hidden w-[132px] shrink-0 overflow-hidden rounded-[var(--radius)] sm:block"
          style={{
            aspectRatio: "2 / 3",
            border: "1px solid var(--border2)",
            boxShadow: "var(--shadow)",
          }}
        >
          <PosterArt name={show.name} posterUrl={show.poster_url} sizes="132px" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(0deg, rgba(0,0,0,.55), transparent 55%)" }}
          />
          <div className="font-display absolute inset-x-[11px] bottom-[11px] text-[15px] uppercase leading-[0.95]">
            {show.name}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1">
          <div className="mb-3 text-[12.5px]" style={{ color: "var(--muted)" }}>
            <Link href="/" style={{ color: "var(--accent2)" }}>
              Biblioteca
            </Link>
            <span> / </span>
            <Link href={`/${slug}`} style={{ color: "var(--muted)" }}>
              {show.name}
            </Link>
            <span> / </span>
            <span className="font-semibold" style={{ color: "var(--text)" }}>
              {code}
            </span>
          </div>

          <h1 className="font-display mb-2 text-[34px] uppercase leading-[0.95] md:text-[44px]">
            {show.name}
          </h1>

          <div className="mb-[14px] text-[14.5px]" style={{ color: "#cfcfd8" }}>
            Temporada {episode.season ?? 1}, Episódio {episode.episode_number ?? 1}
            {episode.title ? ` — ${episode.title}` : ""} ·{" "}
            <span className="font-bold" style={{ color: "var(--accent2)" }}>
              {phrases.length} frases
            </span>
          </div>

          {tags.length > 0 && (
            <div className="mb-[18px] flex flex-wrap gap-[10px]">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-[7px] px-[11px] py-[5px] text-[11.5px] font-semibold"
                  style={{
                    background: "rgba(255,255,255,.08)",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {phrases.length > 0 && (
              <button
                onClick={onStartStudy}
                className="flex items-center gap-[9px] rounded-lg px-[26px] py-3 text-[14.5px] font-bold text-white"
                style={{
                  background: "var(--accent)",
                  boxShadow: "0 10px 28px -8px var(--accent)",
                }}
              >
                <Brain className="h-4 w-4" />
                Iniciar estudo
              </button>
            )}
            {isAdmin && (
              <Link
                href={`/${slug}/${episodeSlugPart(
                  episode.season,
                  episode.episode_number
                )}/edit`}
                className="flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold"
                style={{
                  border: "1px solid var(--border2)",
                  background: "rgba(255,255,255,.06)",
                  color: "var(--text)",
                }}
              >
                <Settings className="h-[15px] w-[15px]" />
                Editar episódio
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
