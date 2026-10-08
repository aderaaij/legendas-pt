"use client";

import { Search, Plus } from "lucide-react";
import Image from "next/image";

import { TVDBSearchResult } from "@/lib/tvdb";

interface ShowSearchViewProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  searching: boolean;
  searchResults: TVDBSearchResult[];
  onSelectResult: (result: TVDBSearchResult) => void;
  onManual: () => void;
}

/** TVDB search step: query input, result list, and a "create manually" escape. */
export default function ShowSearchView({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  searching,
  searchResults,
  onSelectResult,
  onManual,
}: ShowSearchViewProps) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Search className="w-5 h-5" />
        Search TVDB
      </h3>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && onSearch()}
          placeholder="Search for show on TVDB..."
          className="flex-1 px-3 py-2 rounded-md focus:outline-none"
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
        <button
          onClick={onSearch}
          disabled={searching}
          className="px-4 py-2 rounded-md disabled:opacity-50 transition-colors"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div
          className="rounded-lg max-h-60 overflow-y-auto mb-4"
          style={{ border: "1px solid var(--border)" }}
        >
          {searchResults.map((result) => (
            <div
              key={result.objectID}
              onClick={() => onSelectResult(result)}
              className="p-3 flex gap-4 last:border-b-0 cursor-pointer transition-colors"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <Image
                src={result.image_url ?? ""}
                alt={result.name}
                width={60}
                height={80}
                className="w-15 h-20 object-cover rounded"
              />
              <div className="flex-1">
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
          ))}
        </div>
      )}

      <div className="text-center">
        <button
          onClick={onManual}
          className="text-sm font-medium flex items-center gap-1 mx-auto transition-colors hover:opacity-80"
          style={{ color: "var(--blue)" }}
        >
          <Plus className="w-4 h-4" />
          Create manually without TVDB data
        </button>
      </div>
    </div>
  );
}
