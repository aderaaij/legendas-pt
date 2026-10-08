"use client";

import { Film } from "lucide-react";

import { useHomePage } from "./useHomePage";
import { useLanguage } from "@/hooks/useLanguage";
import { LibraryShow } from "@/lib/supabase";
import { buildLibraryRows, pickFeaturedShow } from "@/utils/libraryRows";
import { HeroSection } from "./HeroSection";
import { ShowRail } from "./ShowRail";
import JobStatusBanner from "../common/JobStatusBanner";

interface HomePageProps {
  initialShows: LibraryShow[];
  initialStats: {
    totalShows: number;
    totalExtractions: number;
    totalPhrases: number;
  };
  initialError?: string | null;
}

export default function HomePage({
  initialShows,
  initialStats,
  initialError,
}: HomePageProps) {
  const { t } = useLanguage();
  const { shows, loading, error, refetch } = useHomePage(
    initialShows,
    initialStats,
    initialError
  );

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center" style={{ background: "var(--bg)" }}>
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
          <p style={{ color: "var(--muted)" }}>{t.home.loading}</p>
        </div>
      </div>
    );
  }

  const featured = pickFeaturedShow(shows);
  const rows = buildLibraryRows(shows, t.home.rows);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {error && (
        <div
          className="mx-auto mt-6 max-w-2xl rounded-lg p-4"
          style={{ background: "rgba(229,9,20,.1)", border: "1px solid rgba(229,9,20,.3)" }}
        >
          <p style={{ color: "var(--accent2)" }}>{error}</p>
          <button
            onClick={refetch}
            className="mt-2 text-sm underline hover:no-underline"
            style={{ color: "var(--accent2)" }}
          >
            {t.common.retry}
          </button>
        </div>
      )}

      {shows.length === 0 && !error ? (
        <div className="grid min-h-[60vh] place-items-center px-4">
          <div
            className="max-w-md rounded-2xl p-12 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <Film className="mx-auto mb-4 h-16 w-16" style={{ color: "var(--faint)" }} />
            <h3 className="mb-2 text-xl font-bold">{t.home.emptyTitle}</h3>
            <p style={{ color: "var(--muted)" }}>{t.home.emptyBody}</p>
          </div>
        </div>
      ) : (
        <main className="-mt-[68px]">
          {featured && <HeroSection show={featured} />}

          <div className="px-5 md:px-10">
            <JobStatusBanner />
          </div>

          {rows.map((row) => (
            <ShowRail key={row.key} row={row} />
          ))}

          <div className="h-[60px]" />
        </main>
      )}
    </div>
  );
}
