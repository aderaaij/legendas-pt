"use client";

/** Shimmer placeholder shown while the RTP series preview is being scraped, so
 * the user gets immediate feedback that work is happening. Mirrors the rough
 * shape of {@link SeriesPreviewCard}. */
export default function SeriesPreviewSkeleton() {
  const block = { background: "var(--surface2)" };

  return (
    <div
      className="rounded-lg p-6 animate-pulse"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      aria-busy="true"
      aria-label="Loading series preview"
    >
      <div className="h-6 w-44 rounded mb-4" style={block} />

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded" style={block} />
          <div className="h-4 w-1/2 rounded" style={block} />
          <div className="h-4 w-2/3 rounded" style={block} />
        </div>
      </div>

      <div className="h-4 w-32 rounded mb-3" style={block} />
      <div
        className="rounded-md overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="h-4 w-4 rounded" style={block} />
            <div className="h-4 flex-1 rounded" style={block} />
            <div className="h-4 w-16 rounded" style={block} />
          </div>
        ))}
      </div>
    </div>
  );
}
