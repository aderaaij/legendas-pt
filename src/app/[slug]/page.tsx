"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Calendar,
  TrendingUp,
  Settings,
  Play,
} from "lucide-react";
import Link from "next/link";

import { PhraseExtractionService, ExtractedPhrase, Show, Episode } from "@/lib/supabase";
import { parseShowSlug, normalizeShowName, generateShowSlug } from "@/utils/slugify";
import AnkiExporter from "@/app/components/AnkiExporter";
import { formatDate } from "@/utils/formatDate";

export default function ShowPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [view, setView] = useState<'show' | 'episode'>('show');
  const [show, setShow] = useState<Show | null>(null);
  const [episodes, setEpisodes] = useState<(Episode & { extractionCount: number; totalPhrases: number; lastExtraction: string | null })[]>([]);
  const [phrases, setPhrases] = useState<ExtractedPhrase[]>([]);
  const [showInfo, setShowInfo] = useState<{
    showName: string;
    season?: number;
    episodeNumber?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const loadShowData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Parse the slug to get show information
      const parsedSlug = parseShowSlug(slug);
      setShowInfo(parsedSlug);

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

      // Check if this is a show-only or episode-specific view
      if (parsedSlug.season && parsedSlug.episodeNumber) {
        // Episode-specific view - load phrases for that episode
        setView('episode');
        
        // Find the specific episode
        const allEpisodes = await PhraseExtractionService.getEpisodesForShow(matchingShow.id);
        const targetEpisode = allEpisodes.find(ep => 
          ep.season === parsedSlug.season && ep.episode_number === parsedSlug.episodeNumber
        );

        if (targetEpisode) {
          const episodePhrases = await PhraseExtractionService.getPhrasesForEpisode(targetEpisode.id);
          setPhrases(episodePhrases);
        } else {
          setError(`Episode S${parsedSlug.season}E${parsedSlug.episodeNumber} not found`);
        }
      } else {
        // Show-only view - load episodes for this show
        setView('show');
        const showEpisodes = await PhraseExtractionService.getEpisodesWithExtractionStats(matchingShow.id);
        setEpisodes(showEpisodes);
      }
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
          <p className="text-gray-600">Loading {view === 'show' ? 'show' : 'episode'}...</p>
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

  // Show episodes view
  if (view === 'show') {
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
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {show?.name}
                </h1>
                <p className="text-gray-600">
                  {episodes.length} episode{episodes.length !== 1 ? 's' : ''} with subtitles
                </p>
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
                    href={`/${generateShowSlug(show!.name, episode.season, episode.episode_number)}`}
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

  // Episode view - show phrases for specific episode
  return (
    <div className="min-h-screen bg-gradient-to-tr from-red-200 to-green-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Breadcrumbs */}
        <div className="flex flex-col justify-between mb-8">
          <div className="flex flex-col gap-2">
            {/* Breadcrumb navigation */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-gray-800 transition-colors">
                Shows
              </Link>
              <span>/</span>
              <Link
                href={`/${generateShowSlug(show!.name)}`}
                className="hover:text-gray-800 transition-colors"
              >
                {show?.name}
              </Link>
              <span>/</span>
              <span className="text-gray-900">
                S{showInfo?.season?.toString().padStart(2, '0')}E{showInfo?.episodeNumber?.toString().padStart(2, '0')}
              </span>
            </div>
            
            <Link
              href={`/${generateShowSlug(show!.name)}`}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Episodes</span>
            </Link>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {show?.name}
              </h1>
              {showInfo?.season && showInfo?.episodeNumber && (
                <p className="text-gray-600">
                  Season {showInfo.season}, Episode {showInfo.episodeNumber}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 justify-end mt-4">
            <Link
              href="/manage"
              className="inline-flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Edit Phrases</span>
            </Link>
            <AnkiExporter phrases={ankiPhrases} />
          </div>
        </div>

        {/* Episode Statistics */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Episode Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <p className="text-sm text-gray-600">Episode</p>
                  <p className="text-lg font-semibold text-gray-900">
                    S{showInfo?.season?.toString().padStart(2, '0')}E{showInfo?.episodeNumber?.toString().padStart(2, '0')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Show</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {show?.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

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
              This episode doesn&apos;t have any extracted phrases yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
