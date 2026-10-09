import type { EpisodeEssential } from "@/types/essentials";

/** One ranked essential in the admin list. */
export default function EssentialRow({ essential }: { essential: EpisodeEssential }) {
  return (
    <li
      className="flex gap-3 rounded-lg px-4 py-3"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    >
      <span className="w-6 shrink-0 text-right text-sm font-bold" style={{ color: "var(--faint)" }}>
        {essential.rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-bold">{essential.expression}</span>
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            — {essential.translation}
          </span>
          {essential.note && (
            <span className="text-xs" style={{ color: "var(--gold)" }}>
              {essential.note}
            </span>
          )}
        </div>
        {essential.example && (
          <p className="mt-1 truncate text-xs italic" style={{ color: "var(--faint)" }}>
            “{essential.example}”
          </p>
        )}
      </div>
    </li>
  );
}
