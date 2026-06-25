"use client";

import Image from "next/image";

import { TVDBSearchResult } from "@/lib/tvdb";

interface TVDBResultItemProps {
  result: TVDBSearchResult;
  isSelected: boolean;
  onSelect: (result: TVDBSearchResult) => void;
}

/** A single TVDB search result row (poster + name/network/overview). */
export default function TVDBResultItem({
  result,
  isSelected,
  onSelect,
}: TVDBResultItemProps) {
  return (
    <div
      onClick={() => onSelect(result)}
      className="p-3 flex gap-4 cursor-pointer transition-colors"
      style={{
        borderBottom: "1px solid var(--border)",
        background: isSelected ? "rgba(91,140,255,.12)" : "transparent",
      }}
    >
      <Image
        src={result.image_url ?? ""}
        alt={result.name}
        width={120}
        height={160}
        className="w-30"
      />
      <div className="flex flex-col">
        <div className="font-semibold" style={{ color: "var(--text)" }}>
          {result.name}
        </div>
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          {result.network}
        </div>
        {result.overview && (
          <div
            className="text-sm mt-1 line-clamp-2"
            style={{ color: "var(--faint)" }}
          >
            {result.overview}
          </div>
        )}
      </div>
    </div>
  );
}
