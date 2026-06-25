"use client";

interface RTPUrlFormProps {
  rtpUrl: string;
  onUrlChange: (value: string) => void;
  onPreview: () => void;
  isScrapingPreview: boolean;
  isProcessing: boolean;
  error: string | null;
}

/** Intro card with the RTP series URL input and the preview action. */
export default function RTPUrlForm({
  rtpUrl,
  onUrlChange,
  onPreview,
  isScrapingPreview,
  isProcessing,
  error,
}: RTPUrlFormProps) {
  return (
    <div
      className="rounded-lg p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-2xl font-bold mb-4">RTP Series Importer</h2>
      <p className="mb-6" style={{ color: "var(--muted)" }}>
        Import Portuguese subtitles and extract phrases from RTP Play series.
        Provide a series URL to automatically process all episodes.
      </p>

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
            htmlFor="rtp-url"
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text)" }}
          >
            RTP Series URL
          </label>
          <input
            id="rtp-url"
            type="url"
            value={rtpUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://www.rtp.pt/play/p14147/o-americano"
            className="w-full px-3 py-2 rounded-md focus:outline-none"
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            disabled={isScrapingPreview || isProcessing}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={onPreview}
            disabled={isScrapingPreview || isProcessing}
            className="px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
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
