"use client";

import { SERIES_SOURCES } from "@/lib/sources/meta";
import { LANGUAGES } from "@/lib/i18n/languages";

interface SeriesUrlFormProps {
  seriesUrl: string;
  onUrlChange: (value: string) => void;
  onPreview: () => void;
  isScrapingPreview: boolean;
  error: string | null;
}

/** Intro card with the series URL input (RTP or RTVE) and the preview action. */
export default function SeriesUrlForm({
  seriesUrl,
  onUrlChange,
  onPreview,
  isScrapingPreview,
  error,
}: SeriesUrlFormProps) {
  return (
    <div
      className="rounded-lg p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-2xl font-bold mb-4">Series Importer</h2>
      <p className="mb-6" style={{ color: "var(--muted)" }}>
        Import subtitles and extract phrases from a streaming series. Provide a
        series URL to automatically process all episodes — the site decides the
        language:
      </p>
      <ul className="mb-6 space-y-1 text-sm" style={{ color: "var(--muted)" }}>
        {Object.values(SERIES_SOURCES).map((source) => (
          <li key={source.id}>
            {LANGUAGES[source.language].flag}{" "}
            <span style={{ color: "var(--text)" }}>{source.label} Play</span> —{" "}
            {LANGUAGES[source.language].englishName}, e.g.{" "}
            <code>{source.exampleUrl}</code>
          </li>
        ))}
      </ul>

      <div
        className="rounded-lg p-4 mb-6"
        style={{
          background: "rgba(91,140,255,.08)",
          border: "1px solid rgba(91,140,255,.25)",
        }}
      >
        <h3 className="font-medium mb-2" style={{ color: "var(--blue)" }}>
          Background Processing
        </h3>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Extraction jobs run in the background - you can safely navigate away
          from this page while processing continues. Use the job status panel
          above to track progress and return to check results later.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="series-url"
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text)" }}
          >
            Series URL
          </label>
          <input
            id="series-url"
            type="url"
            value={seriesUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder={SERIES_SOURCES.rtp.exampleUrl}
            className="w-full px-3 py-2 rounded-md focus:outline-none"
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            disabled={isScrapingPreview}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={onPreview}
            disabled={isScrapingPreview}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {isScrapingPreview && (
              <span
                className="animate-spin rounded-full h-4 w-4 border-2 border-white/40"
                style={{ borderTopColor: "#fff" }}
              />
            )}
            {isScrapingPreview ? "Loading Preview..." : "Preview Series"}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mt-4 p-4 rounded-md"
          style={{
            background: "rgba(229,9,20,.1)",
            border: "1px solid rgba(229,9,20,.35)",
            color: "var(--accent2)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
