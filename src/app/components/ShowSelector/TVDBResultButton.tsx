"use client";

import Image from "next/image";

import { TVDBSearchResult } from "@/lib/tvdb";

interface TVDBResultButtonProps {
  result: TVDBSearchResult;
  isCreatingShow: boolean;
  onSelect: () => void;
}

/** A single TVDB search result rendered as a create-show button. */
export default function TVDBResultButton({
  result,
  isCreatingShow,
  onSelect,
}: TVDBResultButtonProps) {
  return (
    <button
      onClick={onSelect}
      disabled={isCreatingShow}
      className="w-full text-left p-3 rounded-lg border transition-colors hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-start gap-3">
        {result.image_url && (
          <Image
            src={result.image_url}
            alt={result.name}
            width={48}
            height={64}
            className="w-12 h-16 object-cover rounded"
          />
        )}
        <div className="flex-1">
          <div className="font-medium" style={{ color: "var(--text)" }}>
            {result.name}
          </div>
          <div
            className="text-sm line-clamp-2"
            style={{ color: "var(--muted)" }}
          >
            {result.overview}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--faint)" }}>
            {result.network && <span className="mr-2">📺 {result.network}</span>}
            {result.year && <span>📅 {result.year}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
