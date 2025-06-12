"use client";

import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";

interface SubtitleUploaderProps {
  onSubtitleLoad: (content: string) => void;
}

export default function SubtitleUploader({
  onSubtitleLoad,
}: SubtitleUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
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

      setFileName(file.name);
      onSubtitleLoad(parsedText);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse subtitle file"
      );
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="space-y-4">
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
