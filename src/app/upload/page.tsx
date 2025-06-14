"use client";

import { useState } from "react";
import { ArrowLeft, Upload, BookOpen, FileText, Languages } from "lucide-react";
import SubtitleUploader from "@/app/components/SubtitleUploader";
import PhraseExtractor from "@/app/components/PhraseExtractor";
import { PhraseItem } from "@/app/components/AnkiExporter";
import Link from "next/link";

export interface SubtitleMetadata {
  source: string;
  showName: string;
  season?: number;
  episodeNumber?: number;
}

export default function UploadPage() {
  const [subtitleContent, setSubtitleContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [metadata, setMetadata] = useState<SubtitleMetadata | null>(null);

  const [phrases, setPhrases] = useState<PhraseItem[]>([]);

  const handleSubtitleLoad = (
    content: string,
    filename: string,
    subtitleMetadata?: SubtitleMetadata
  ) => {
    setSubtitleContent(content);
    setFileName(filename);
    setMetadata(subtitleMetadata || null);
  };

  const handleCancel = () => {
    // Clear all upload page state
    setSubtitleContent("");
    setFileName("");
    setMetadata(null);
    setPhrases([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-red-200 to-green-500">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12">
          <div className="flex flex-col space-x-3 mb-6 gap-4">
            <Link
              href="/"
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Library</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Languages className="text-blue-600" />
                Upload New Subtitles
              </h1>
            </div>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl">
            Upload Portuguese subtitle files to extract meaningful phrases for
            language learning
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Step 1: Upload Subtitles */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-full">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">
                1. Upload Subtitles
              </h2>
            </div>
            <SubtitleUploader onSubtitleLoad={handleSubtitleLoad} onCancel={handleCancel} />
          </div>

          {/* Step 2: Extract Phrases */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-2 rounded-full">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">
                2. Extract Phrases
              </h2>
            </div>
            <PhraseExtractor
              subtitleContent={subtitleContent}
              onPhrasesExtracted={setPhrases}
              fileName={fileName}
              metadata={metadata}
            />
          </div>
        </div>

        {/* Phrases Preview */}
        {phrases.length > 0 && (
          <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-gray-600" />
                <h2 className="text-2xl font-semibold text-gray-800">
                  Extracted Phrases
                </h2>
              </div>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {phrases.length} phrases
              </span>
            </div>

            {/* Phrases Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
              {phrases.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-green-50"
                >
                  <div className="font-semibold text-gray-800 mb-1">
                    {item.phrase}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {item.translation}
                  </div>

                  <div className="text-xs text-green-600 mt-2">
                    Frequency: {item.frequency}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
