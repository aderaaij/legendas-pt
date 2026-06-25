"use client";

import { Hash, Calendar, Clock } from "lucide-react";

import { FormField, FormTextarea } from "@/app/components/ui/FormField";

import type { EpisodeFormData } from "./useMetadataEditor";

interface EpisodeMetadataFormProps {
  episodeData: EpisodeFormData;
  onChange: (patch: Partial<EpisodeFormData>) => void;
}

/** The "Episode Information" column of the metadata editor. */
export default function EpisodeMetadataForm({
  episodeData,
  onChange,
}: EpisodeMetadataFormProps) {
  return (
    <div>
      <h3
        className="text-lg font-semibold mb-4 flex items-center gap-2"
        style={{ color: "var(--text)" }}
      >
        <Hash className="w-5 h-5" />
        Episode Information
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Season"
            type="number"
            min="1"
            value={episodeData.season}
            onChange={(v) => onChange({ season: parseInt(v) || 1 })}
          />
          <FormField
            label="Episode"
            type="number"
            min="1"
            value={episodeData.episode_number}
            onChange={(v) => onChange({ episode_number: parseInt(v) || 1 })}
          />
        </div>

        <FormField
          label="Episode Title"
          value={episodeData.title}
          onChange={(title) => onChange({ title })}
          placeholder="Episode title..."
        />

        <FormField
          label="Air Date"
          icon={<Calendar className="w-4 h-4" />}
          type="date"
          value={episodeData.air_date}
          onChange={(air_date) => onChange({ air_date })}
        />

        <FormField
          label="Duration (minutes)"
          icon={<Clock className="w-4 h-4" />}
          type="number"
          min="1"
          value={episodeData.duration_minutes || ""}
          onChange={(v) => onChange({ duration_minutes: parseInt(v) || null })}
          placeholder="Runtime in minutes..."
        />

        <FormTextarea
          label="Episode Description"
          value={episodeData.description}
          onChange={(description) => onChange({ description })}
          placeholder="Brief description of the episode..."
        />
      </div>
    </div>
  );
}
