import Link from "next/link";
import { Calendar, Play } from "lucide-react";

import { Show } from "@/lib/supabase";
import {
  generateShowSlug,
  episodeCode,
  episodeSlugPart,
} from "@/utils/slugify";
import { formatDatePt } from "@/utils/formatDate";
import { PosterArt } from "@/app/components/home/PosterArt";
import { EpisodeWithStats } from "./SeriesPageClient";

interface SeriesEpisodeCardProps {
  show: Show;
  episode: EpisodeWithStats;
}

export const SeriesEpisodeCard = ({ show, episode }: SeriesEpisodeCardProps) => {
  const slug = generateShowSlug(show.name);
  const code = episodeCode(episode.season, episode.episode_number);
  const title = episode.title || `Episódio ${episode.episode_number ?? ""}`.trim();
  const date = formatDatePt(episode.air_date || episode.lastExtraction);

  return (
    <Link
      href={`/${slug}/${episodeSlugPart(episode.season, episode.episode_number)}`}
      className="group block overflow-hidden rounded-[var(--radius-lg)] transition-all duration-200 hover:-translate-y-[3px]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="relative h-[108px]">
        <PosterArt
          name={show.name}
          posterUrl={episode.episode_image || show.poster_url}
          sizes="(max-width: 768px) 100vw, 320px"
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.78))",
          }}
        />
        <div className="font-display absolute left-[14px] top-[13px] text-[16px] tracking-[0.06em] text-white">
          {code}
        </div>
        <div
          className="absolute right-3 top-3 grid h-[34px] w-[34px] place-items-center rounded-full opacity-95"
          style={{
            background: "var(--accent)",
            boxShadow: "0 6px 16px -4px var(--accent)",
          }}
        >
          <Play className="h-[14px] w-[14px] text-white" fill="currentColor" />
        </div>
        <div className="absolute inset-x-[14px] bottom-[11px] truncate text-[14.5px] font-bold text-white">
          {title}
        </div>
      </div>

      <div className="px-[15px] py-[13px]">
        <div className="flex items-center justify-between">
          <span
            className="flex items-center gap-[6px] text-[11.5px]"
            style={{ color: "var(--faint)" }}
          >
            <Calendar className="h-[13px] w-[13px]" />
            {date}
          </span>
          <span className="text-[12px] font-extrabold" style={{ color: "var(--accent2)" }}>
            {episode.totalPhrases} frases
          </span>
        </div>
      </div>
    </Link>
  );
};
