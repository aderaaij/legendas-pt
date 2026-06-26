"use client";

import { Loader2, X } from "lucide-react";

import { useShowImportJob } from "@/hooks/useShowImportJob";
import type {
  EpisodeState,
  EpisodeStatus,
  ImportResults,
} from "@/lib/rtp-import/types";

const STATUS_META: Record<
  EpisodeStatus,
  { label: string; color: string; spin?: boolean }
> = {
  pending: { label: "Em espera", color: "var(--faint)" },
  scraping: { label: "A obter legendas", color: "var(--blue)", spin: true },
  extracting: { label: "A extrair frases", color: "var(--blue)", spin: true },
  saving: { label: "A guardar", color: "var(--blue)", spin: true },
  success: { label: "Concluído", color: "var(--green)" },
  already_exists: { label: "Já existe", color: "var(--muted)" },
  no_subtitle: { label: "Sem legendas", color: "var(--faint)" },
  extraction_failed: { label: "Falhou", color: "var(--accent2)" },
  error: { label: "Erro", color: "var(--accent2)" },
};

export default function ImportProgressPanel({ showId }: { showId: string }) {
  const { job, cancelJob } = useShowImportJob(showId);
  if (!job) return null;

  const results = job.results as unknown as ImportResults | undefined;
  const episodes: EpisodeState[] = results?.episodes
    ? Object.values(results.episodes).sort(
        (a, b) => a.episodeNumber - b.episodeNumber
      )
    : [];

  const progress = job.progress ?? 0;

  return (
    <section className="px-5 pt-6 md:px-10">
      <div
        className="rounded-2xl p-5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="mb-3 flex items-center gap-3">
          <Loader2
            className="h-4 w-4 animate-spin"
            style={{ color: "var(--accent)" }}
          />
          <h3 className="text-[15px] font-bold" style={{ color: "var(--text)" }}>
            A importar episódios
          </h3>
          <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>
            {job.completed_episodes + job.failed_episodes}/{job.total_episodes}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => cancelJob(job.id)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] transition-colors hover:opacity-80"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
            }}
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>
        </div>

        {/* Progress bar */}
        <div
          className="mb-2 h-2 w-full overflow-hidden rounded-full"
          style={{ background: "var(--surface2)" }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${progress}%`, background: "var(--accent)" }}
          />
        </div>

        {job.current_episode && (
          <p className="mb-4 text-[12.5px]" style={{ color: "var(--muted)" }}>
            {job.current_episode}
          </p>
        )}

        {/* Per-episode list */}
        <div className="grid gap-1.5">
          {episodes.map((ep) => {
            const meta = STATUS_META[ep.status] ?? STATUS_META.pending;
            return (
              <div
                key={ep.episodeNumber}
                className="flex items-center gap-2 text-[13px]"
              >
                <span
                  className="w-14 shrink-0 font-medium"
                  style={{ color: "var(--text)" }}
                >
                  Ep. {ep.episodeNumber}
                </span>
                <span className="truncate" style={{ color: "var(--muted)" }}>
                  {ep.title}
                </span>
                <div className="flex-1" />
                <span
                  className="flex shrink-0 items-center gap-1.5 text-[12px]"
                  style={{ color: meta.color }}
                >
                  {meta.spin && <Loader2 className="h-3 w-3 animate-spin" />}
                  {ep.status === "success" && ep.phraseCount != null
                    ? `${ep.phraseCount} frases`
                    : meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
