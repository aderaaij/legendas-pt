"use client";

import { Tv, ExternalLink } from "lucide-react";

import {
  FieldLabel,
  FormField,
  FormTextarea,
  fieldInputClassName,
  fieldInputStyle,
} from "@/app/components/ui/FormField";
import { TVDBSearchResult } from "@/lib/tvdb";

import EpisodesPreviewList from "./EpisodesPreviewList";
import type { EpisodePreview, ShowFormData } from "./useShowTVDBCreator";

const labelStyle = { color: "var(--text)" };

interface ShowDetailsFormProps {
  showData: ShowFormData;
  onChange: (patch: Partial<ShowFormData>) => void;
  selectedTVDBShow: TVDBSearchResult | null;
  episodes: EpisodePreview[];
  season: number;
}

/** The show-metadata form (with optional "selected from TVDB" banner) shown
 * alongside the list of episodes that will be imported. */
export default function ShowDetailsForm({
  showData,
  onChange,
  selectedTVDBShow,
  episodes,
  season,
}: ShowDetailsFormProps) {
  return (
    <>
      {selectedTVDBShow && (
        <div
          className="rounded-lg p-4 mb-6"
          style={{
            background: "rgba(61,220,132,.1)",
            border: "1px solid rgba(61,220,132,.25)",
          }}
        >
          <h3
            className="font-medium mb-2 flex items-center gap-2"
            style={{ color: "var(--green)" }}
          >
            <Tv className="w-5 h-5" />
            TVDB Show Selected: {selectedTVDBShow.name}
          </h3>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Show data has been pre-filled from TVDB. You can modify any fields
            before creating.
          </p>
        </div>
      )}

      {/* Show Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Show Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Tv className="w-5 h-5" />
            Show Information
          </h3>
          <div className="space-y-4">
            <FormField
              label="Show Name *"
              labelStyle={labelStyle}
              value={showData.name}
              onChange={(name) => onChange({ name })}
              placeholder="Enter show name..."
            />

            <div>
              <FieldLabel style={labelStyle}>Source</FieldLabel>
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
              labelStyle={labelStyle}
              value={showData.network}
              onChange={(network) => onChange({ network })}
              placeholder="e.g., Netflix, HBO, RTP1..."
            />

            <FormField
              label="Genres (comma-separated)"
              labelStyle={labelStyle}
              value={showData.genres}
              onChange={(genres) => onChange({ genres })}
              placeholder="Drama, Comedy, Thriller..."
            />

            <FormTextarea
              label="Overview"
              labelStyle={labelStyle}
              value={showData.overview}
              onChange={(overview) => onChange({ overview })}
              placeholder="Brief description of the show..."
            />

            <FormField
              label="Watch URL"
              labelStyle={labelStyle}
              icon={<ExternalLink className="w-4 h-4" />}
              type="url"
              value={showData.watch_url}
              onChange={(watch_url) => onChange({ watch_url })}
              placeholder="https://example.com/show-name"
              hint="Link where users can watch this show"
            />
          </div>
        </div>

        {/* Episodes Preview */}
        <EpisodesPreviewList episodes={episodes} season={season} />
      </div>
    </>
  );
}
