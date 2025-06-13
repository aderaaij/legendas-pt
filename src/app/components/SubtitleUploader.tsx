"use client";

import { useRef } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { SubtitleMetadata } from "../upload/page";
import { useSubtitleUploader } from "@/hooks/useSubtitleUploade";

interface SubtitleUploaderProps {
  onSubtitleLoad: (
    content: string,
    fileName: string,
    metadata: SubtitleMetadata
  ) => void;
}

export default function SubtitleUploader({
  onSubtitleLoad,
}: SubtitleUploaderProps) {
  const {
    isLoading,
    fileName,
    showMetadataForm,
    metadata,
    setMetadata,
    setShowMetadataForm,
    handleMetadataConfirm,
    handleDrop,
    isDragging,
    setIsDragging,
    handleFileSelect,
    error,
  } = useSubtitleUploader({ onSubtitleLoad });

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* Metadata Form Modal */}
      {showMetadataForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Configure Show Metadata
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            Please review and complete the show information below:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source *
              </label>
              <select
                value={metadata.source}
                onChange={(e) =>
                  setMetadata((prev) => ({ ...prev, source: e.target.value }))
                }
                className="w-full text-gray-800 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="RTP">RTP (Rádio e Televisão de Portugal)</option>
                <option value="SIC">
                  SIC (Sociedade Independente de Comunicação)
                </option>
                <option value="TVI">TVI (Televisão Independente)</option>
                <option value="RTP2">RTP2</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Show Name *
              </label>
              <input
                type="text"
                value={metadata.showName}
                onChange={(e) =>
                  setMetadata((prev) => ({ ...prev, showName: e.target.value }))
                }
                className="text-gray-800 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter show name..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Season (optional)
              </label>
              <input
                type="number"
                value={metadata.season || ""}
                onChange={(e) =>
                  setMetadata((prev) => ({
                    ...prev,
                    season: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  }))
                }
                className="text-gray-800 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 1"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Episode Number (optional)
              </label>
              <input
                type="number"
                value={metadata.episodeNumber || ""}
                onChange={(e) =>
                  setMetadata((prev) => ({
                    ...prev,
                    episodeNumber: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  }))
                }
                className="text-gray-800 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 1"
                min="1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setShowMetadataForm(false)}
              className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMetadataConfirm}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Continue with Extraction
            </button>
          </div>
        </div>
      )}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".vtt,.srt,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Processing subtitle file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Upload className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Upload Subtitle File
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Drag and drop your .vtt or .srt file here, or click to browse
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Choose File
              </button>
            </div>
          </div>
        )}
      </div>

      {fileName && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium">Loaded: {fileName}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
