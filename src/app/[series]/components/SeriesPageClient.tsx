"use client";

import { Film } from "lucide-react";

import { Show, Episode } from "@/lib/supabase";
import { ShowInfoSection } from "./ShowInfoSection";
import { SeriesEpisodeCard } from "./SeriesEpisodeCard";

export type EpisodeWithStats = Episode & {
  extractionCount: number;
  totalPhrases: number;
  lastExtraction: string | null;
};

interface SeriesPageClientProps {
  show: Show;
  episodes: EpisodeWithStats[];
  series: string;
}

export default function SeriesPageClient({
  show,
  episodes,
}: SeriesPageClientProps) {
  const sortedEpisodes = [...episodes].sort(
    (a, b) =>
      (a.season ?? 0) - (b.season ?? 0) ||
      (a.episode_number ?? 0) - (b.episode_number ?? 0)
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <ShowInfoSection show={show} episodes={episodes} />

      {episodes.length > 0 ? (
        <section className="px-5 pb-[60px] pt-2 md:px-10">
          <div className="mb-[22px] flex items-center gap-3">
            <h2 className="text-[22px] font-extrabold tracking-[-0.01em]">Episódios</h2>
            <span
              className="rounded-full px-[11px] py-1 text-[12px] font-bold"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              {episodes.length} {episodes.length === 1 ? "episódio" : "episódios"}
            </span>
            <div className="flex-1" />
            <span className="hidden text-[12.5px] sm:block" style={{ color: "var(--faint)" }}>
              Clica num episódio para ver as frases
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedEpisodes.map((episode) => (
              <SeriesEpisodeCard key={episode.id} episode={episode} show={show} />
            ))}
          </div>
        </section>
      ) : (
        <section className="px-5 pb-[60px] md:px-10">
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <Film className="mx-auto mb-4 h-16 w-16" style={{ color: "var(--faint)" }} />
            <h3 className="mb-2 text-xl font-bold">Sem episódios</h3>
            <p style={{ color: "var(--muted)" }}>
              Esta série ainda não tem episódios com frases extraídas.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
