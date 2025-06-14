"use client";

import { useRef } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { SubtitleMetadata } from "../upload/page";
import { useSubtitleUploader } from "@/hooks/useSubtitleUploader";
import ShowSelector from "./ShowSelector";

interface SubtitleUploaderProps {
  onSubtitleLoad: (
    content: string,
    fileName: string,
    metadata: SubtitleMetadata
  ) => void;
  onCancel?: () => void;
}

export default function SubtitleUploader({
  onSubtitleLoad,
  onCancel,
}: SubtitleUploaderProps) {
  const {
    isLoading,
    fileName,
    showMetadataForm,
    handleShowSelected,
    handleDrop,
    isDragging,
    setIsDragging,
    handleFileSelect,
    error,
    selectedShow,
    selectedEpisode,
    handleCancel,
  } = useSubtitleUploader({ onSubtitleLoad });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCancelClick = () => {
    handleCancel();
    onCancel?.();
  };

  return (
    <div className="space-y-4">
      {/* Show Selection Modal */}
      {showMetadataForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Select Show and Episode
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            Choose an existing show or add a new one from TVDB:
          </p>

          <ShowSelector onShowSelected={handleShowSelected} />

          {selectedShow && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Current Selection:</h4>
              <p className="text-sm text-green-700">
                <strong>{selectedShow.name}</strong>
                {selectedEpisode && (
                  <span> - Season {selectedEpisode.season}, Episode {selectedEpisode.episode_number}</span>
                )}
              </p>
              <p className="text-xs text-green-600 mt-1">
                You can select a different show or episode above if needed.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handleCancelClick}
              className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
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
