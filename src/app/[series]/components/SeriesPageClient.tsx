"use client";

import { useMemo, useState } from "react";
import { Film } from "lucide-react";

import { Show, Episode } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ShowInfoSection } from "./ShowInfoSection";
import { SeriesEpisodeCard } from "./SeriesEpisodeCard";
import ImportProgressPanel from "./ImportProgressPanel";

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
  const { isAdmin } = useAuth();

  // Group episodes by season (treating a missing season as 1), each sorted by
  // episode number, and keep the seasons themselves in ascending order.
  const seasons = useMemo(() => {
    const map = new Map<number, EpisodeWithStats[]>();
    for (const ep of episodes) {
      const s = ep.season ?? 1;
      const arr = map.get(s) ?? [];
      arr.push(ep);
      map.set(s, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.episode_number ?? 0) - (b.episode_number ?? 0));
    }
    return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
  }, [episodes]);

  const seasonNumbers = useMemo(() => [...seasons.keys()], [seasons]);
  const [selectedSeason, setSelectedSeason] = useState<number>(
    () => seasonNumbers[0] ?? 1
  );

  const currentSeason = seasonNumbers.includes(selectedSeason)
    ? selectedSeason
    : seasonNumbers[0] ?? 1;
  const currentEpisodes = seasons.get(currentSeason) ?? [];
  const hasMultipleSeasons = seasonNumbers.length > 1;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <ShowInfoSection show={show} episodes={episodes} />

      {isAdmin && <ImportProgressPanel showId={show.id} />}

      {episodes.length > 0 ? (
        <section className="px-5 pb-[60px] pt-2 md:px-10">
          <div className="mb-[22px]">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[22px] font-extrabold tracking-[-0.01em]">Episódios</h2>
              <span
                className="rounded-full px-[11px] py-1 text-[12px] font-bold"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
              >
                {currentEpisodes.length}{" "}
                {currentEpisodes.length === 1 ? "episódio" : "episódios"}
              </span>
              <div className="flex-1" />
              <span className="hidden text-[12.5px] sm:block" style={{ color: "var(--faint)" }}>
                Clica num episódio para ver as frases
              </span>
            </div>

            {hasMultipleSeasons && (
              <div
                className="mt-4 flex flex-wrap items-center gap-6"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                {seasonNumbers.map((s) => {
                  const active = s === currentSeason;
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedSeason(s)}
                      className="-mb-px cursor-pointer px-1 pb-2.5 text-[14px] font-bold transition-colors"
                      style={{
                        color: active ? "var(--text)" : "var(--faint)",
                        borderBottom: active
                          ? "2px solid var(--accent)"
                          : "2px solid transparent",
                      }}
                    >
                      Temporada {s}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentEpisodes.map((episode) => (
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
