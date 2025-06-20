"use client";

import { useState } from "react";
import { ArrowLeft, Upload, BookOpen, Languages, Globe, Merge } from "lucide-react";
import SubtitleUploader from "@/app/components/SubtitleUploader";
import PhraseExtractor from "@/app/components/PhraseExtractor";
import RTPImporter from "@/app/components/RTPImporter";
import ShowMerger from "@/app/components/ShowMerger";
import { AdminRoute } from "@/app/components/ProtectedRoute";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateShowSlug } from "@/utils/slugify";

export interface SubtitleMetadata {
  source: string;
  showName: string;
  season?: number;
  episodeNumber?: number;
}

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'rtp' | 'merge'>('upload');
  const [subtitleContent, setSubtitleContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [metadata, setMetadata] = useState<SubtitleMetadata | null>(null);
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  
  const router = useRouter();

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
    setIsRedirecting(false);
  };

  const handleExtractionSuccess = async (showName: string, season?: number, episodeNumber?: number) => {
    setIsRedirecting(true);
    
    // Generate the appropriate redirect URL
    if (season && episodeNumber) {
      // Redirect to episode edit page
      const seriesSlug = generateShowSlug(showName);
      const episodeSlug = `s${String(season).padStart(2, '0')}e${String(episodeNumber).padStart(2, '0')}`;
      router.push(`/${seriesSlug}/${episodeSlug}/edit`);
    } else {
      // Redirect to series page if no episode info
      const seriesSlug = generateShowSlug(showName);
      router.push(`/${seriesSlug}`);
    }
  };

  return (
    <AdminRoute redirectTo="/">
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

          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'upload'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 px-4">
                      <Upload className="w-4 h-4" />
                      Manual Upload
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('rtp')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'rtp'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 px-4">
                      <Globe className="w-4 h-4" />
                      RTP Series Import
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('merge')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'merge'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 px-4">
                      <Merge className="w-4 h-4" />
                      Merge Shows
                    </div>
                  </button>
                </nav>
              </div>

              <div className="p-8">
                {activeTab === 'upload' && (
                  <div className="space-y-8">
                    {/* Upload Section */}
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Upload className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-800">
                          Upload Subtitles
                        </h2>
                      </div>
                      <SubtitleUploader onSubtitleLoad={handleSubtitleLoad} onCancel={handleCancel} />
                    </div>

                    {/* Extraction Section - only show when subtitle is loaded */}
                    {subtitleContent && (
                      <div className="border-t pt-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="bg-green-100 p-2 rounded-full">
                            <BookOpen className="w-5 h-5 text-green-600" />
                          </div>
                          <h2 className="text-xl font-semibold text-gray-800">
                            Extract Phrases
                          </h2>
                        </div>
                        <PhraseExtractor
                          subtitleContent={subtitleContent}
                          onExtractionSuccess={handleExtractionSuccess}
                          fileName={fileName}
                          metadata={metadata}
                        />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'rtp' && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-green-100 p-2 rounded-full">
                        <Globe className="w-5 h-5 text-green-600" />
                      </div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        Import from RTP Series
                      </h2>
                    </div>
                    <RTPImporter />
                  </div>
                )}

                {activeTab === 'merge' && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-purple-100 p-2 rounded-full">
                        <Merge className="w-5 h-5 text-purple-600" />
                      </div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        Merge Duplicate Shows
                      </h2>
                    </div>
                    <ShowMerger />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Redirect Loading State */}
          {isRedirecting && (
            <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Extraction Complete!
                  </h3>
                  <p className="text-gray-600">
                    Redirecting to the editing interface...
                  </p>
                </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminRoute>
    );
}
