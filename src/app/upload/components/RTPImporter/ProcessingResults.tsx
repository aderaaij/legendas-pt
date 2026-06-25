"use client";

import { getStatusColor, getStatusText } from "./rtpStatus";
import type { ScrapingResult, ScrapingSummary } from "./useRTPImporter";

interface ProcessingResultsProps {
  results: ScrapingResult[];
  summary: ScrapingSummary | null;
}

/** Processing results card: the summary totals grid and per-episode result rows. */
export default function ProcessingResults({
  results,
  summary,
}: ProcessingResultsProps) {
  return (
    <div
      className="rounded-lg p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3 className="text-xl font-semibold mb-4">Processing Results</h3>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <SummaryCell value={summary.total} label="Total" color="var(--text)" />
          <SummaryCell
            value={summary.successful}
            label="Success"
            color="var(--green)"
          />
          <SummaryCell
            value={summary.alreadyExists}
            label="Existing"
            color="var(--blue)"
          />
          <SummaryCell
            value={summary.noSubtitle}
            label="No Subtitle"
            color="var(--gold)"
          />
          <SummaryCell
            value={summary.failed}
            label="Failed"
            color="var(--accent2)"
          />
        </div>
      )}

      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={index}
            className="flex justify-between items-center p-3 rounded-md"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <div>
              <span className="font-medium">Ep. {result.episode}</span>
              <span className="ml-2" style={{ color: "var(--muted)" }}>
                {result.title}
              </span>
              {result.phraseCount && (
                <span className="ml-2 text-sm" style={{ color: "var(--green)" }}>
                  ({result.phraseCount} phrases)
                </span>
              )}
            </div>
            <div className="text-right">
              <span
                className="font-medium"
                style={{ color: getStatusColor(result.status) }}
              >
                {getStatusText(result.status)}
              </span>
              {result.error && (
                <div className="text-sm mt-1" style={{ color: "var(--accent2)" }}>
                  {result.error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCell({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-sm" style={{ color: "var(--muted)" }}>
        {label}
      </div>
    </div>
  );
}
