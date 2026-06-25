import Link from "next/link";

import { LibraryShow } from "@/lib/supabase";
import { generateShowSlug } from "@/utils/slugify";
import { PosterArt } from "./PosterArt";

interface ShowRailCardProps {
  show: LibraryShow;
}

export function ShowRailCard({ show }: ShowRailCardProps) {
  const slug = generateShowSlug(show.name);
  const channel = show.network || show.source;

  return (
    <Link href={`/${slug}`} className="group block w-[190px] shrink-0">
      <div
        className="relative overflow-hidden rounded-[var(--radius)] transition-transform duration-300 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:-translate-y-1 group-hover:scale-[1.05]"
        style={{
          aspectRatio: "2 / 3",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow)",
        }}
      >
        <PosterArt name={show.name} posterUrl={show.poster_url} />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(0deg, rgba(0,0,0,.9) 4%, rgba(0,0,0,.15) 45%, transparent 70%)",
          }}
        />
        {channel && (
          <div
            className="absolute left-3 top-3 rounded-md px-2 py-[3px] text-[10px] font-extrabold tracking-[0.1em] text-white backdrop-blur-sm"
            style={{ background: "rgba(0,0,0,.5)" }}
          >
            {channel}
          </div>
        )}
        <div className="absolute inset-x-[14px] bottom-[14px]">
          <div
            className="font-display text-[21px] uppercase leading-[0.95] tracking-[0.01em]"
            style={{ textShadow: "0 2px 14px rgba(0,0,0,.7)" }}
          >
            {show.name}
          </div>
          <div
            className="mt-2 flex items-center gap-2 text-[11.5px]"
            style={{ color: "rgba(255,255,255,.82)" }}
          >
            <span className="font-bold" style={{ color: "var(--accent2)" }}>
              {show.totalPhrases}
            </span>
            <span>frases</span>
            <span
              className="h-[3px] w-[3px] rounded-full"
              style={{ background: "rgba(255,255,255,.4)" }}
            />
            <span>
              {show.extractionCount}{" "}
              {show.extractionCount === 1 ? "extração" : "extrações"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
