"use client";

import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { SubtitleMetadata } from "../upload/page";

interface SubtitleUploaderProps {
  onSubtitleLoad: (
    content: string,
    fileName: string,
    metadata: SubtitleMetadata
  ) => void;
}

interface DetectedMetadata {
  source?: string;
  showName?: string;
  season?: number;
  episodeNumber?: number;
  language?: string;
  confidence: number;
}

export default function SubtitleUploader({
  onSubtitleLoad,
}: SubtitleUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [detectedMetadata, setDetectedMetadata] =
    useState<DetectedMetadata | null>(null);
  const [metadata, setMetadata] = useState<SubtitleMetadata>({
    source: "RTP",
    showName: "",
    season: undefined,
    episodeNumber: undefined,
  });
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [subtitleContent, setSubtitleContent] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseVTT = (content: string): string => {
    // Remove VTT header and metadata
    const lines = content.split("\n");
    const textLines: string[] = [];

    let isTextLine = false;
    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines, timestamps, and metadata
      if (
        !trimmedLine ||
        trimmedLine.startsWith("WEBVTT") ||
        trimmedLine.includes("-->") ||
        /^\d+$/.test(trimmedLine)
      ) {
        isTextLine = false;
        continue;
      }

      // This is subtitle text
      if (trimmedLine && !trimmedLine.includes("-->")) {
        textLines.push(trimmedLine);
      }
    }

    return textLines.join(" ");
  };

  const parseSRT = (content: string): string => {
    const lines = content.split("\n");
    const textLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip sequence numbers, timestamps, and empty lines
      if (
        !trimmedLine ||
        /^\d+$/.test(trimmedLine) ||
        trimmedLine.includes("-->")
      ) {
        continue;
      }

      textLines.push(trimmedLine);
    }

    return textLines.join(" ");
  };

  const detectMetadataFromFilename = (filename: string): DetectedMetadata => {
    // Try to parse common patterns like "Show.Name.S01E01.vtt" or "Show Name - 1x01.vtt"
    const seasonEpisodeMatch = filename.match(/[Ss](\d+)[Ee](\d+)|(\d+)x(\d+)/);
    const showNameMatch = filename
      .replace(/\.(vtt|srt)$/i, "")
      .replace(/[Ss]\d+[Ee]\d+|\d+x\d+.*/, "")
      .replace(/[._-]/g, " ")
      .trim();

    // Try to detect source from filename patterns
    let detectedSource = "RTP"; // default
    if (filename.toLowerCase().includes("rtp")) detectedSource = "RTP";
    else if (filename.toLowerCase().includes("sic")) detectedSource = "SIC";
    else if (filename.toLowerCase().includes("tvi")) detectedSource = "TVI";

    const confidence = seasonEpisodeMatch && showNameMatch ? 0.8 : 0.5;

    return {
      source: detectedSource,
      showName: showNameMatch || "Unknown Show",
      season: seasonEpisodeMatch
        ? parseInt(seasonEpisodeMatch[1] || seasonEpisodeMatch[3])
        : undefined,
      episodeNumber: seasonEpisodeMatch
        ? parseInt(seasonEpisodeMatch[2] || seasonEpisodeMatch[4])
        : undefined,
      language: "pt",
      confidence,
    };
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError("");

    try {
      const text = await file.text();
      let parsedText = "";

      if (file.name.toLowerCase().endsWith(".vtt")) {
        parsedText = parseVTT(text);
      } else if (file.name.toLowerCase().endsWith(".srt")) {
        parsedText = parseSRT(text);
      } else {
        // Assume it's plain text
        parsedText = text;
      }

      if (parsedText.length < 50) {
        throw new Error("The subtitle file appears to be too short or empty");
      }

      // Detect metadata from filename
      const detected = detectMetadataFromFilename(file.name);
      setDetectedMetadata(detected);

      // Auto-populate metadata form
      setMetadata({
        source: detected.source || "RTP",
        showName: detected.showName || "",
        season: detected.season,
        episodeNumber: detected.episodeNumber,
      });

      setFileName(file.name);
      setSubtitleContent(parsedText);
      setShowMetadataForm(true); // Show metadata form for user to review/edit
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse subtitle file"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMetadataConfirm = () => {
    if (!metadata.showName.trim()) {
      setError("Show name is required");
      return;
    }

    onSubtitleLoad(subtitleContent, fileName, metadata);
    setShowMetadataForm(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const subtitleFile = files.find(
      (file) =>
        file.name.toLowerCase().endsWith(".vtt") ||
        file.name.toLowerCase().endsWith(".srt") ||
        file.type === "text/plain"
    );

    if (subtitleFile) {
      handleFileUpload(subtitleFile);
    } else {
      setError("Please upload a .vtt or .srt subtitle file");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

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

      {detectedMetadata && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Auto-Detected Metadata
            <span
              className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(
                detectedMetadata.confidence
              )}`}
            >
              {getConfidenceText(detectedMetadata.confidence)}
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {detectedMetadata.source && (
              <div>
                <span className="font-medium">Source:</span>{" "}
                {detectedMetadata.source.toUpperCase()}
              </div>
            )}
            {detectedMetadata.showName && (
              <div>
                <span className="font-medium">Show:</span>{" "}
                {detectedMetadata.showName}
              </div>
            )}
            {detectedMetadata.season && (
              <div>
                <span className="font-medium">Season:</span>{" "}
                {detectedMetadata.season}
              </div>
            )}
            {detectedMetadata.episodeNumber && (
              <div>
                <span className="font-medium">Episode:</span>{" "}
                {detectedMetadata.episodeNumber}
              </div>
            )}
          </div>
          <p className="text-xs text-blue-700 mt-2">
            You can override these values below if they&apos;re incorrect.
          </p>
        </div>
      )}

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
