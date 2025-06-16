"use client";

import { FileText, Languages } from "lucide-react";
import Link from "next/link";

import { useHomePage, ShowWithExtractions } from "@/hooks/useHomePage";
import { useAuth } from "@/hooks/useAuth";
import { ShowCard } from "./ShowCard";
import { LibraryStatistics } from "./LibraryStatistics";

interface HomePageProps {
  initialShows: ShowWithExtractions[];
  initialStats: {
    totalShows: number;
    totalExtractions: number;
    totalPhrases: number;
  };
  initialError?: string | null;
}

export default function HomePage({ initialShows, initialStats, initialError }: HomePageProps) {
  const { shows, loading, error, refetch, stats } = useHomePage(initialShows, initialStats, initialError);
  const { isAdmin } = useAuth();

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

          {/* {isAdmin && (
            <div className="flex items-center justify-center">
              <Link
                href="/upload"
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                <Upload className="w-5 h-5" />
                <span>Upload New Subtitles</span>
              </Link>
            </div>
          )} */}
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
                {isAdmin
                  ? "Upload your first subtitle file to get started!"
                  : "Contact an admin to upload subtitle files."}
              </p>
              {isAdmin && (
                <Link
                  href="/upload"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Subtitles
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Statistics */}
            <LibraryStatistics stats={stats} />

            {/* Shows Header */}

            {/* Shows Grid */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Available Shows
                </h2>
                <span className="text-sm text-gray-500">
                  Click any show to explore phrases
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shows.map((show) => (
                  <ShowCard key={show.id} show={show} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
