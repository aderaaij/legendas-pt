"use client";

import { Download, FileDown, X } from "lucide-react";

import { PhraseItem } from "@/types/phrase";
import { useLanguage } from "@/hooks/useLanguage";
import type { TargetLanguage } from "@/lib/i18n/languages";

interface AnkiExporterProps {
  phrases: PhraseItem[];
  /** The phrases' (content) language; names the downloaded files. */
  language: TargetLanguage;
  isExportMode?: boolean;
  onEnterExportMode?: () => void;
  onExitExportMode?: () => void;
  selectedCount?: number;
  totalCount?: number;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

/** "Español" → "espanol": ASCII-only, lowercase, for filenames. */
const toFileSafe = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function AnkiExporter({
  phrases,
  language,
  isExportMode = false,
  onEnterExportMode,
  onExitExportMode,
  selectedCount = 0,
  totalCount = 0,
  onSelectAll,
  onDeselectAll,
}: AnkiExporterProps) {
  const { t } = useLanguage();
  // e.g. "frases-portugues" (pt UI, pt show) or "frases-espanol" (es UI, es show).
  const fileBase = `${t.anki.filePrefix}-${toFileSafe(t.languageNames[language])}`;

  const generateAnkiCSV = (): string => {
    const headers = ["Front", "Back"];
    const rows = phrases.map((item) => [
      `"${item.phrase}"`,
      `"${item.translation}"`,
    ]);
    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  };

  const generateAnkiTSV = (): string =>
    phrases.map((item) => [item.phrase, item.translation].join("\t")).join("\n");

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () =>
    downloadFile(generateAnkiCSV(), `${fileBase}.csv`, "text/csv");

  const handleDownloadAnki = () =>
    downloadFile(generateAnkiTSV(), `${fileBase}-anki.txt`, "text/plain");

  // Normal mode — toolbar button.
  if (!isExportMode) {
    return (
      <button
        onClick={onEnterExportMode}
        className="flex items-center gap-2 rounded-lg px-4 py-[9px] text-[13px] font-bold"
        style={{
          border: "1px solid var(--border2)",
          background: "rgba(255,255,255,.05)",
          color: "var(--text)",
        }}
      >
        <Download className="h-[14px] w-[14px]" />
        {t.anki.exportButton}
      </button>
    );
  }

  // Export mode — selection + download panel.
  return (
    <div
      className="w-full rounded-[var(--radius-lg)] p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-extrabold">{t.anki.title}</h3>
        <button
          onClick={onExitExportMode}
          style={{ color: "var(--muted)" }}
          className="transition-colors hover:opacity-80"
          aria-label={t.common.close}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] p-3"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            {t.anki.selectedOf(selectedCount, totalCount)}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className="rounded-md px-3 py-1 text-xs font-semibold"
              style={{ background: "rgba(229,9,20,.14)", color: "var(--accent2)" }}
            >
              {t.anki.selectAll}
            </button>
            <button
              onClick={onDeselectAll}
              className="rounded-md px-3 py-1 text-xs font-semibold"
              style={{ background: "rgba(255,255,255,.06)", color: "var(--muted)" }}
            >
              {t.anki.clear}
            </button>
          </div>
        </div>
      </div>

      {phrases.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={handleDownloadAnki}
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-[10px] text-sm font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            <Download className="h-4 w-4" />
            {t.anki.toAnki}
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-[10px] text-sm font-bold"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <Download className="h-4 w-4" />
            {t.anki.asCsv}
          </button>
        </div>
      ) : (
        <div className="py-4 text-center" style={{ color: "var(--faint)" }}>
          <FileDown className="mx-auto mb-2 h-8 w-8" />
          <p className="text-sm">{t.anki.empty}</p>
        </div>
      )}
    </div>
  );
}
