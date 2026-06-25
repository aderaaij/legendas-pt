"use client";

import { useRef } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { SubtitleMetadata } from "../page";
import { useSubtitleUploader } from "./useSubtitleUploader";
import ShowSelector from "@/app/components/ShowSelector";

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
    setShowMetadataForm,
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
        <div
          className="rounded-lg p-6"
          style={{
            background: "rgba(91,140,255,.08)",
            border: "1px solid rgba(91,140,255,.25)",
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--blue)" }}>
            Select Show and Episode
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            Choose an existing show or add a new one from TVDB:
          </p>

          <ShowSelector onShowSelected={handleShowSelected} />

          {selectedShow && (
            <div
              className="mt-4 p-4 rounded-lg"
              style={{
                background: "rgba(61,220,132,.1)",
                border: "1px solid rgba(61,220,132,.25)",
              }}
            >
              <h4 className="font-medium mb-2" style={{ color: "var(--green)" }}>Current Selection:</h4>
              <p className="text-sm" style={{ color: "var(--text)" }}>
                <strong>{selectedShow.name}</strong>
                {selectedEpisode && (
                  <span> - Season {selectedEpisode.season}, Episode {selectedEpisode.episode_number}</span>
                )}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                You can select a different show or episode above if needed.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handleCancelClick}
              className="px-4 py-2 rounded-md transition-colors"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border2)",
                color: "var(--text)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
        style={{
          borderColor: isDragging ? "var(--accent)" : "var(--border2)",
          background: isDragging ? "rgba(229,9,20,.08)" : "var(--surface2)",
        }}
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
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: "var(--accent)", borderBottomColor: "var(--accent)" }}
            ></div>
            <p style={{ color: "var(--muted)" }}>Processing subtitle file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Upload className="w-12 h-12" style={{ color: "var(--faint)" }} />
            <div>
              <p className="text-lg font-medium mb-2" style={{ color: "var(--text)" }}>
                Upload Subtitle File
              </p>
              <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
                Drag and drop your .vtt or .srt file here, or click to browse
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 rounded-lg transition-colors"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Choose File
              </button>
            </div>
          </div>
        )}
      </div>

      {fileName && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg"
          style={{ background: "rgba(61,220,132,.1)", color: "var(--green)" }}
        >
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium">Loaded: {fileName}</span>
        </div>
      )}

      {/* Show current selection and allow editing */}
      {selectedShow && !showMetadataForm && (
        <div
          className="rounded-lg p-4"
          style={{
            background: "rgba(91,140,255,.08)",
            border: "1px solid rgba(91,140,255,.25)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium mb-1" style={{ color: "var(--blue)" }}>Selected for Extraction:</h4>
              <p className="text-sm" style={{ color: "var(--text)" }}>
                <strong>{selectedShow.name}</strong>
                {selectedEpisode && (
                  <span> - Season {selectedEpisode.season}, Episode {selectedEpisode.episode_number}</span>
                )}
                {!selectedEpisode && (
                  <span> - No specific episode selected</span>
                )}
              </p>
            </div>
            <button
              onClick={() => setShowMetadataForm(true)}
              className="text-sm underline transition-colors hover:opacity-80"
              style={{ color: "var(--blue)" }}
            >
              Change Selection
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg"
          style={{ background: "rgba(229,9,20,.1)", color: "var(--accent2)" }}
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
