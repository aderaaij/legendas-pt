"use client";

import { Loader2, RefreshCw, Sparkles } from "lucide-react";

import type { EpisodeEssential } from "@/types/essentials";

import EssentialRow from "./EssentialRow";

interface EssentialsSectionProps {
  essentials: EpisodeEssential[];
  regenerating: boolean;
  message: string | null;
  onRegenerate: () => void;
  onReload: () => void;
}

/** The "Essentials" card: the ranked list plus a regenerate action. */
export default function EssentialsSection({
  essentials,
  regenerating,
  message,
  onRegenerate,
  onReload,
}: EssentialsSectionProps) {
  return (
    <div
      className="mb-8 rounded-[var(--radius-lg)] p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
          Essentials
        </h2>
        <span
          className="rounded-full px-3 py-1 text-sm font-medium"
          style={{ background: "rgba(245,196,81,.15)", color: "var(--gold)" }}
        >
          {essentials.length} essentials
        </span>
        <div className="flex-1" />
        <button
          onClick={onReload}
          className="grid h-9 w-9 place-items-center rounded-lg"
          style={{ border: "1px solid var(--border2)", color: "var(--muted)" }}
          aria-label="Reload essentials"
          title="Reload"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {regenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>{essentials.length ? "Regenerate essentials" : "Generate essentials"}</span>
        </button>
      </div>

      {message && (
        <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
          {message}
        </p>
      )}

      {essentials.length > 0 ? (
        <ol className="space-y-2">
          {essentials.map((essential) => (
            <EssentialRow key={essential.id} essential={essential} />
          ))}
        </ol>
      ) : (
        <p className="text-sm" style={{ color: "var(--faint)" }}>
          No essentials yet for this episode.
        </p>
      )}
    </div>
  );
}
