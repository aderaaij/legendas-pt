"use client";

import type { SourceSeason } from "@/types/series-source";

interface SeasonPickerProps {
  seasons: SourceSeason[];
  value: string | undefined;
  onChange: (seasonId: string) => void;
  disabled?: boolean;
}

/** Season dropdown for sources whose programs span several seasons (RTVE). */
export default function SeasonPicker({
  seasons,
  value,
  onChange,
  disabled,
}: SeasonPickerProps) {
  return (
    <label className="flex items-center gap-2">
      <strong>Season:</strong>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="px-2 py-1 rounded-md focus:outline-none"
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
        {seasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.label}
            {season.episodeCount != null ? ` (${season.episodeCount})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
