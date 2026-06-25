"use client";

import { Tv, ExternalLink } from "lucide-react";

import {
  FieldLabel,
  FormField,
  FormTextarea,
  fieldInputClassName,
  fieldInputStyle,
} from "@/app/components/ui/FormField";

import type { ShowFormData } from "./useMetadataEditor";

interface ShowMetadataFormProps {
  showData: ShowFormData;
  onChange: (patch: Partial<ShowFormData>) => void;
}

/** The "Show Information" column of the metadata editor. */
export default function ShowMetadataForm({
  showData,
  onChange,
}: ShowMetadataFormProps) {
  return (
    <div>
      <h3
        className="text-lg font-semibold mb-4 flex items-center gap-2"
        style={{ color: "var(--text)" }}
      >
        <Tv className="w-5 h-5" />
        Show Information
      </h3>
      <div className="space-y-4">
        <FormField
          label="Show Name *"
          value={showData.name}
          onChange={(name) => onChange({ name })}
          placeholder="Enter show name..."
        />

        <div>
          <FieldLabel>Source</FieldLabel>
          <select
            value={showData.source}
            onChange={(e) => onChange({ source: e.target.value })}
            className={fieldInputClassName}
            style={fieldInputStyle}
          >
            <option value="rtp">RTP</option>
            <option value="sic">SIC</option>
            <option value="tvi">TVI</option>
            <option value="netflix">Netflix</option>
            <option value="hbo">HBO</option>
            <option value="other">Other</option>
          </select>
        </div>

        <FormField
          label="Network"
          value={showData.network}
          onChange={(network) => onChange({ network })}
          placeholder="e.g., Netflix, HBO, RTP1..."
        />

        <FormField
          label="Genres (comma-separated)"
          value={showData.genres}
          onChange={(genres) => onChange({ genres })}
          placeholder="Drama, Comedy, Thriller..."
        />

        <FormTextarea
          label="Overview"
          value={showData.overview}
          onChange={(overview) => onChange({ overview })}
          placeholder="Brief description of the show..."
        />

        <FormField
          label="Watch URL"
          icon={<ExternalLink className="w-4 h-4" />}
          type="url"
          value={showData.watch_url}
          onChange={(watch_url) => onChange({ watch_url })}
          placeholder="https://example.com/show-name"
          hint="Link where users can watch this show"
        />
      </div>
    </div>
  );
}
