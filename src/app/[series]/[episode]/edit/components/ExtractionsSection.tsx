"use client";

import { FileText } from "lucide-react";

import type { EpisodeExtraction } from "@/hooks/useEpisodeEdit";

import ExtractionRow from "./ExtractionRow";

interface ExtractionsSectionProps {
  extractions: EpisodeExtraction[];
  deleting: string | null;
  showName: string;
  onEditExtraction: (
    extractionId: string,
    showName: string,
    episodeTitle?: string
  ) => void;
  onDeleteExtraction: (extractionId: string) => void;
}

/** The "Phrase Extractions" card: list of extraction rows or an empty state. */
export default function ExtractionsSection({
  extractions,
  deleting,
  showName,
  onEditExtraction,
  onDeleteExtraction,
}: ExtractionsSectionProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
          Phrase Extractions
        </h2>
        <span
          className="px-3 py-1 rounded-full text-sm font-medium"
          style={{ background: "rgba(91,140,255,.15)", color: "var(--blue)" }}
        >
          {extractions.length} extractions
        </span>
      </div>

      {extractions.length > 0 ? (
        <div className="space-y-3">
          {extractions.map((extraction) => (
            <ExtractionRow
              key={extraction.id}
              extraction={extraction}
              isDeleting={deleting === extraction.id}
              onEdit={() =>
                onEditExtraction(extraction.id, showName, extraction.source)
              }
              onDelete={() => onDeleteExtraction(extraction.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: "var(--faint)" }}
          />
          <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>
            No Extractions Found
          </h3>
          <p style={{ color: "var(--muted)" }}>
            This episode doesn&apos;t have any phrase extractions yet.
          </p>
        </div>
      )}
    </div>
  );
}
