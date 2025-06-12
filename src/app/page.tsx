"use client";

import { useState } from "react";
import { Upload, Download, BookOpen, Languages, FileText } from "lucide-react";
import SubtitleUploader from "./components/SubtitleUploader";
import PhraseExtractor from "./components/PhraseExtractor";
import AnkiExporter from "./components/AnkiExporter";

export default function Home() {
  const [subtitleContent, setSubtitleContent] = useState<string>("");
  const [phrases, setPhrases] = useState<
    Array<{
      phrase: string;
      context: string;
      translation: string;
      frequency: number;
    }>
  >([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
            <Languages className="text-blue-600" />
            Portuguese Phrase Extractor
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Extract meaningful Portuguese phrases from subtitles using AI to
            enhance your language learning experience
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
            <SubtitleUploader onSubtitleLoad={setSubtitleContent} />
          </div>

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
            />
          </div>

          {/* Step 3: Export to Anki */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 p-2 rounded-full">
                <Download className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">
                3. Export to Anki
              </h2>
            </div>
            <AnkiExporter phrases={phrases} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {phrases.slice(0, 50).map((item, index) => (
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
                  <div className="text-xs text-gray-500 bg-white p-2 rounded italic">
                    &quot;{item.context}&quot;
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
