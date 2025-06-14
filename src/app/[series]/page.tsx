"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Calendar,
  Play,
  Edit3,
} from "lucide-react";
import Link from "next/link";

import { PhraseExtractionService, Show, Episode } from "@/lib/supabase";
import { parseShowSlug, normalizeShowName, generateShowSlug } from "@/utils/slugify";
import { formatDate } from "@/utils/formatDate";

export default function SeriesPage() {
  const params = useParams();
  const series = params.series as string;

  const [show, setShow] = useState<Show | null>(null);
  const [episodes, setEpisodes] = useState<(Episode & { extractionCount: number; totalPhrases: number; lastExtraction: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const loadShowData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Parse the series slug to get show information
      const parsedSlug = parseShowSlug(series);

      // Find the actual show in the database
      const shows = await PhraseExtractionService.getAllShows();
      const normalizedSlugName = normalizeShowName(parsedSlug.showName);
      
      const matchingShow = shows.find(s => 
        normalizeShowName(s.name) === normalizedSlugName ||
        normalizeShowName(s.name).includes(normalizedSlugName) ||
        normalizedSlugName.includes(normalizeShowName(s.name))
      );

      if (!matchingShow) {
        setError("Show not found");
        return;
      }

      setShow(matchingShow);

      // Load episodes for this show
      const showEpisodes = await PhraseExtractionService.getEpisodesWithExtractionStats(matchingShow.id);
      setEpisodes(showEpisodes);
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
  }, [series]);

  useEffect(() => {
    loadShowData();
  }, [loadShowData]);

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
        <div className="flex flex-col justify-between mb-8">
          <div className="flex flex-col gap-2 space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Shows</span>
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {show?.name}
                </h1>
                <p className="text-gray-600">
                  {episodes.length} episode{episodes.length !== 1 ? 's' : ''} with subtitles
                </p>
              </div>
              <Link
                href={`/${generateShowSlug(show!.name)}/edit`}
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Show</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Episodes Grid */}
        {episodes.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Episodes</h2>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {episodes.length} episodes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {episodes.map((episode) => (
                <Link
                  key={episode.id}
                  href={`/${generateShowSlug(show!.name)}/s${episode.season?.toString().padStart(2, '0')}e${episode.episode_number?.toString().padStart(2, '0')}`}
                  className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-blue-300 block"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        S{episode.season?.toString().padStart(2, '0')}E{episode.episode_number?.toString().padStart(2, '0')}
                        {episode.title && `: ${episode.title}`}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {episode.lastExtraction && (
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(episode.lastExtraction)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <Play className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {episode.extractionCount}
                      </div>
                      <div className="text-xs text-gray-500">
                        {episode.extractionCount === 1 ? "Extraction" : "Extractions"}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {episode.totalPhrases}
                      </div>
                      <div className="text-xs text-gray-500">
                        {episode.totalPhrases === 1 ? "Phrase" : "Phrases"}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Episodes Found
            </h3>
            <p className="text-gray-600">
              This show doesn&apos;t have any episodes with extracted phrases yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}