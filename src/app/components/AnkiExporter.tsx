"use client";

import { Download, FileDown } from "lucide-react";

export interface PhraseItem {
  phrase: string;
  translation: string;
  frequency: number;
}

interface AnkiExporterProps {
  phrases: PhraseItem[];
}

export default function AnkiExporter({ phrases }: AnkiExporterProps) {
  const generateAnkiCSV = (): string => {
    const headers = ["Front", "Back", "Frequency"];
    const rows = phrases.map((item) => [
      `"${item.phrase}"`,
      `"${item.translation}"`,

      `"${item.frequency}"`,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  };

  const generateAnkiTSV = (): string => {
    return phrases
      .map((item) =>
        [item.phrase, item.translation, item.frequency.toString()].join("\t")
      )
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

  if (phrases.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileDown className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Extract phrases to enable export</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 flex gap-4">
      <div className="bg-blue-50 p-4 rounded-lg h-full">
        <h3 className="font-semibold text-blue-800 mb-2">Ready to Export</h3>
        <p className="text-sm text-blue-700 mb-4">
          {phrases.length} phrases ready for Anki import
        </p>

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
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2">
          Anki Import Instructions
        </h4>
        <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
          <li>Open Anki and select your Portuguese deck</li>
          <li>Go to File → Import</li>
          <li>Select the downloaded .txt file</li>
          <li>Map fields: Front, Back, Frequency</li>
          <li>Click Import to add your vocabulary cards</li>
        </ol>
      </div>
    </div>
  );
}
