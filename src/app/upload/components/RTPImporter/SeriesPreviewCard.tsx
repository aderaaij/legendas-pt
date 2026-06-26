"use client";

import { Show } from "@/lib/supabase";
import { decodeHtmlEntities } from "@/utils/htmlUtils";
import type { RTPSeries } from "@/types/rtp";

interface SeriesPreviewCardProps {
  seriesPreview: RTPSeries;
  selectedEpisodes: Set<number>;
  onToggleEpisode: (episodeNumber: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  selectedShow: Show | null;
  onChangeShowSelection: () => void;
  saveToDatabase: boolean;
  onSaveToDatabaseChange: (value: boolean) => void;
  forceReExtraction: boolean;
  onForceReExtractionChange: (value: boolean) => void;
  isProcessing: boolean;
  onProcess: () => void;
}

/** Series preview card: episode selection, target-show status, processing
 * options, and the process action. */
export default function SeriesPreviewCard({
  seriesPreview,
  selectedEpisodes,
  onToggleEpisode,
  onSelectAll,
  onDeselectAll,
  selectedShow,
  onChangeShowSelection,
  saveToDatabase,
  onSaveToDatabaseChange,
  forceReExtraction,
  onForceReExtractionChange,
  isProcessing,
  onProcess,
}: SeriesPreviewCardProps) {
  return (
    <div
      className="rounded-lg p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3 className="text-xl font-semibold mb-4">Series Preview</h3>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <p>
            <strong>Title:</strong> {decodeHtmlEntities(seriesPreview.title)}
          </p>
          <p>
            <strong>Episodes Found:</strong> {seriesPreview.episodes.length}
          </p>
          <p>
            <strong>Season:</strong> {seriesPreview.season ?? 1}
            {seriesPreview.season == null && (
              <span style={{ color: "var(--muted)" }}> (assumed — no season in title)</span>
            )}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">Episodes to Process:</h4>
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className="px-3 py-1 text-sm rounded transition-colors"
              style={{ background: "rgba(91,140,255,.15)", color: "var(--blue)" }}
              disabled={isProcessing}
            >
              Select All
            </button>
            <button
              onClick={onDeselectAll}
              className="px-3 py-1 text-sm rounded transition-colors"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border2)",
                color: "var(--text)",
              }}
              disabled={isProcessing}
            >
              Deselect All
            </button>
          </div>
        </div>
        <div className="text-sm mb-2" style={{ color: "var(--muted)" }}>
          {selectedEpisodes.size} of {seriesPreview.episodes.length} episodes
          selected
        </div>
        <div
          className="max-h-48 overflow-y-auto rounded-md"
          style={{ border: "1px solid var(--border)" }}
        >
          {seriesPreview.episodes.map((episode) => (
            <label
              key={episode.id}
              className="flex items-center p-3 last:border-b-0 cursor-pointer transition-colors"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <input
                type="checkbox"
                checked={selectedEpisodes.has(episode.episodeNumber)}
                onChange={() => onToggleEpisode(episode.episodeNumber)}
                className="mr-3 rounded"
                style={{ accentColor: "var(--accent)" }}
                disabled={isProcessing}
              />
              <div className="flex justify-between items-start flex-1">
                <div>
                  <span className="font-medium">Ep. {episode.episodeNumber}</span>
                  <span className="ml-2" style={{ color: "var(--muted)" }}>
                    {episode.title}
                  </span>
                </div>
                <span className="text-sm" style={{ color: "var(--faint)" }}>
                  {episode.airDate}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* Show Selection Status */}
        {selectedShow && (
          <div
            className="rounded-lg p-4"
            style={{
              background: "rgba(61,220,132,.1)",
              border: "1px solid rgba(61,220,132,.25)",
            }}
          >
            <h4 className="font-medium mb-2" style={{ color: "var(--green)" }}>
              Show Selected
            </h4>
            <p style={{ color: "var(--text)" }}>
              Episodes will be mapped to:{" "}
              <span className="font-medium">{selectedShow.name}</span>
            </p>
            <button
              onClick={onChangeShowSelection}
              className="mt-2 text-sm underline transition-colors hover:opacity-80"
              style={{ color: "var(--green)" }}
              disabled={isProcessing}
            >
              Change show selection
            </button>
          </div>
        )}

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={saveToDatabase}
              onChange={(e) => onSaveToDatabaseChange(e.target.checked)}
              className="mr-2"
              style={{ accentColor: "var(--accent)" }}
              disabled={isProcessing}
            />
            Save to database
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={forceReExtraction}
              onChange={(e) => onForceReExtractionChange(e.target.checked)}
              className="mr-2"
              style={{ accentColor: "var(--accent)" }}
              disabled={isProcessing}
            />
            Force re-extraction (even if content exists)
          </label>
        </div>

        <button
          onClick={onProcess}
          disabled={isProcessing}
          className="px-6 py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ background: "var(--green)", color: "#04210f" }}
        >
          {isProcessing
            ? "Processing Episodes..."
            : selectedShow
            ? "Process All Episodes"
            : "Select Show & Process Episodes"}
        </button>
      </div>
    </div>
  );
}
