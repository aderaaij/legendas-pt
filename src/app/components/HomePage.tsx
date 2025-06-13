"use client";

import {
  Play,
  FileText,
  Calendar,
  Upload,
  Languages,
  Settings,
} from "lucide-react";
import Link from "next/link";

import { generateShowSlug } from "@/utils/slugify";
import { useHomePage } from "@/hooks/useHomePage";
import { formatDate } from "@/utils/formatDate";

export default function HomePage() {
  const { shows, loading, error, refetch, stats } = useHomePage();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-blue-200 to-pink-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading shows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-300 to-pink-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
            <Languages className="text-blue-600" />
            Portuguese Subtitle Library
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            Explore extracted Portuguese phrases from your favorite shows and
            download them for language learning
          </p>

          <div className="flex items-center space-x-4">
            <Link
              href="/upload"
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              <Upload className="w-5 h-5" />
              <span>Upload New Subtitles</span>
            </Link>

            {shows.length > 0 && (
              <Link
                href="/manage"
                className="inline-flex items-center space-x-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors shadow-lg"
              >
                <Settings className="w-5 h-5" />
                <span>Manage & Edit</span>
              </Link>
            )}
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
            <p className="text-red-600">{error}</p>
            <button
              onClick={refetch}
              className="mt-2 text-red-700 underline hover:no-underline text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {shows.length === 0 && !loading && !error ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-lg p-12 max-w-md mx-auto">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Shows Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Upload your first subtitle file to get started!
              </p>
              <Link
                href="/upload"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Subtitles
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Statistics */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Library Statistics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {stats.totalShows}
                  </div>
                  <div className="text-gray-600">Shows</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {stats.totalExtractions}
                  </div>
                  <div className="text-gray-600">Extractions</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {stats.totalPhrases}
                  </div>
                  <div className="text-gray-600">Total Phrases</div>
                </div>
              </div>
            </div>

            {/* Shows Grid */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Your Shows
                </h2>
                <span className="text-sm text-gray-500">
                  Click any show to explore phrases
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shows.map((show) => (
                  <Link
                    key={show.id}
                    href={`/${generateShowSlug(show.name)}`}
                    className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-blue-300 block"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {show.name}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="bg-gray-200 px-2 py-1 rounded text-xs">
                            {show.source}
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(show.lastExtraction)}</span>
                          </span>
                        </div>
                      </div>
                      <Play className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {show.extractionCount}
                        </div>
                        <div className="text-xs text-gray-500">
                          {show.extractionCount === 1
                            ? "Extraction"
                            : "Extractions"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {show.totalPhrases}
                        </div>
                        <div className="text-xs text-gray-500">
                          {show.totalPhrases === 1 ? "Phrase" : "Phrases"}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
