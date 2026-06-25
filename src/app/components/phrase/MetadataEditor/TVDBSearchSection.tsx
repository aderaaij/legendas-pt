"use client";

import { Search } from "lucide-react";

import { TVDBSearchResult } from "@/lib/tvdb";

import TVDBResultItem from "./TVDBResultItem";

interface TVDBSearchSectionProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  searching: boolean;
  searchResults: TVDBSearchResult[];
  selectedTVDBShow: TVDBSearchResult | null;
  onSelectResult: (result: TVDBSearchResult) => void;
}

/** TVDB search input plus the list of matching show results. */
export default function TVDBSearchSection({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  searching,
  searchResults,
  selectedTVDBShow,
  onSelectResult,
}: TVDBSearchSectionProps) {
  return (
    <div className="mb-6">
      <h3
        className="text-lg font-semibold mb-3 flex items-center gap-2"
        style={{ color: "var(--text)" }}
      >
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
          className="rounded-lg max-h-60 overflow-y-auto"
          style={{ border: "1px solid var(--border)" }}
        >
          {searchResults.map((result) => (
            <TVDBResultItem
              key={result.objectID}
              result={result}
              isSelected={selectedTVDBShow?.objectID === result.objectID}
              onSelect={onSelectResult}
            />
          ))}
        </div>
      )}
    </div>
  );
}
