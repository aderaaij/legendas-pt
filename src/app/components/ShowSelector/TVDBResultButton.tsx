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
      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
          <div className="font-medium text-gray-900">{result.name}</div>
          <div className="text-sm text-gray-600 line-clamp-2">
            {result.overview}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {result.network && <span className="mr-2">📺 {result.network}</span>}
            {result.year && <span>📅 {result.year}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
