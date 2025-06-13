"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Calendar,
  TrendingUp,
  Settings,
} from "lucide-react";
import Link from "next/link";

import { PhraseExtractionService, ExtractedPhrase } from "@/lib/supabase";
import { parseShowSlug, normalizeShowName } from "@/utils/slugify";
import AnkiExporter from "@/app/components/AnkiExporter";
import { formatDate } from "@/utils/formatDate";

export default function ShowPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [phrases, setPhrases] = useState<ExtractedPhrase[]>([]);
  const [showInfo, setShowInfo] = useState<{
    showName: string;
    season?: number;
    episodeNumber?: number;
  } | null>(null);
  const [extractionInfo, setExtractionInfo] = useState<{
    source: string;
    totalPhrases: number;
    createdAt: string;
    wasTruncated: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const loadShowData = useCallback(async () => {
    try {
      setLoading(true);

      // Parse the slug to get show information
      const parsedSlug = parseShowSlug(slug);
      setShowInfo(parsedSlug);

      // Get all extractions and find matching ones
      const stats = await PhraseExtractionService.getExtractionStats();

      // Find extractions that match the slug using normalized names
      const normalizedSlugName = normalizeShowName(parsedSlug.showName);
      const matchingExtractions = stats.filter((stat) => {
        const statShowName = stat.show?.name || "Unknown Show";
        const normalizedStatName = normalizeShowName(statShowName);

        // First try exact normalized match
        if (normalizedStatName === normalizedSlugName) {
          return true;
        }

        // Then try partial matching
        return (
          normalizedStatName.includes(normalizedSlugName) ||
          normalizedSlugName.includes(normalizedStatName)
        );
      });

      if (matchingExtractions.length === 0) {
        setError("No extractions found for this show");
        return;
      }

      // For now, take the first matching extraction
      // You could enhance this to find the exact season/episode match
      const extraction = matchingExtractions[0];

      setExtractionInfo({
        source: extraction.source || "Unknown",
        totalPhrases: extraction.total_phrases_found || 0,
        createdAt: extraction.created_at || "",
        wasTruncated: extraction.was_truncated || false,
      });

      // Load phrases for this extraction
      const extractedPhrases =
        await PhraseExtractionService.getExtractedPhrases(extraction.id);
      setPhrases(extractedPhrases);
    } catch (err) {
      setError(
        `Failed to load show data: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error loading show data:", err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadShowData();
  }, [loadShowData]);

  // Convert to format expected by AnkiExporter
  const ankiPhrases = phrases.map((phrase) => ({
    phrase: phrase.phrase,
    translation: phrase.translation,
    frequency: 1,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading show...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-red-200 to-green-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col  justify-between mb-4">
          <div className="flex flex-col gap-2 space-x-3 mb-8">
            <Link
              href="/"
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Shows</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {showInfo?.showName}
              </h1>
              {showInfo?.season && showInfo?.episodeNumber && (
                <p className="text-gray-600">
                  Season {showInfo.season}, Episode {showInfo.episodeNumber}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 justify-between">
            <Link
              href="/manage"
              className="inline-flex mt-auto items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Edit Phrases</span>
            </Link>
            <AnkiExporter phrases={ankiPhrases} />
          </div>
        </div>

        {/* Show Statistics */}
        {extractionInfo && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Show Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Phrases</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {phrases.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Source</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {extractionInfo.source}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Extracted</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDate(extractionInfo.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {extractionInfo.wasTruncated ? "Truncated" : "Complete"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phrases Grid */}
        {phrases.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Phrases</h2>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {phrases.length} phrases
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {phrases.map((phrase, index) => (
                <div
                  key={phrase.id || index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50"
                >
                  <div className="font-semibold text-gray-800 mb-2">
                    {phrase.phrase}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    {phrase.translation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Phrases Found
            </h3>
            <p className="text-gray-600">
              This show doesn&apos;t have any extracted phrases yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
