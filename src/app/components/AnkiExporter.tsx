"use client";

import { Download, FileDown, X } from "lucide-react";

export interface PhraseItem {
  phrase: string;
  translation: string;
  frequency?: number;
}

interface AnkiExporterProps {
  phrases: PhraseItem[];
  isExportMode?: boolean;
  onEnterExportMode?: () => void;
  onExitExportMode?: () => void;
  selectedCount?: number;
  totalCount?: number;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export default function AnkiExporter({
  phrases,
  isExportMode = false,
  onEnterExportMode,
  onExitExportMode,
  selectedCount = 0,
  totalCount = 0,
  onSelectAll,
  onDeselectAll,
}: AnkiExporterProps) {
  const generateAnkiCSV = (): string => {
    const headers = ["Front", "Back"];
    const rows = phrases.map((item) => [
      `"${item.phrase}"`,
      `"${item.translation}"`,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  };

  const generateAnkiTSV = (): string => {
    return phrases
      .map((item) => [item.phrase, item.translation].join("\t"))
      .join("\n");
  };

  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string
  ) => {
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

  const handleDownloadCSV = () => {
    const csv = generateAnkiCSV();
    downloadFile(csv, "portuguese-phrases.csv", "text/csv");
  };

  const handleDownloadAnki = () => {
    const ankiContent = generateAnkiTSV();
    downloadFile(ankiContent, "portuguese-phrases-anki.txt", "text/plain");
  };

  // Normal mode - just show export button
  if (!isExportMode) {
    return (
      <button
        onClick={onEnterExportMode}
        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Export Phrases</span>
      </button>
    );
  }

  // Export mode - show selection controls and export options
  return (
    <div className="space-y-4">
      {/* Export Mode Header with Controls */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-blue-800">Export Phrases</h3>
          <button
            onClick={onExitExportMode}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selection Controls */}
        <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-md border">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {selectedCount} of {totalCount} phrases selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={onSelectAll}
                className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={onDeselectAll}
                className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {selectedCount === 0 && "No phrases selected"}
            {selectedCount > 0 && `${selectedCount} phrases ready for export`}
          </div>
        </div>

        {/* Export Buttons */}
        {phrases.length > 0 ? (
          <div className="space-y-2">
            <button
              onClick={handleDownloadAnki}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download for Anki (.txt)
            </button>

            <button
              onClick={handleDownloadCSV}
              className="w-full flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download as CSV
            </button>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <FileDown className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Select phrases to enable export</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2">
          Anki Import Instructions
        </h4>
        <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
          <li>Open Anki and select your Portuguese deck</li>
          <li>Go to File → Import</li>
          <li>Select the downloaded .txt file</li>
          <li>Map fields: Front, Back</li>
          <li>Click Import to add your vocabulary cards</li>
        </ol>
      </div>
    </div>
  );
}
