"use client";

import {
  FileText,
  Calendar,
  Play,
  Edit3,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { Show, Episode } from "@/lib/supabase";
import { generateShowSlug } from "@/utils/slugify";
import { useAuth } from "@/hooks/useAuth";
import { ClientDate } from "@/app/components/ClientDate";
import Breadcrumb from "@/app/components/Breadcrumb";

type EpisodeWithStats = Episode & { extractionCount: number; totalPhrases: number; lastExtraction: string | null };

interface SeriesPageClientProps {
  show: Show;
  episodes: EpisodeWithStats[];
  series: string;
}

export default function SeriesPageClient({ show, episodes }: SeriesPageClientProps) {
  const { isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-tr from-red-200 to-green-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Breadcrumb 
            items={[
              { label: "Shows", href: "/" },
              { label: show.name, isCurrentPage: true }
            ]} 
            className="mb-6"
          />
          
          {/* Show info section */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Thumbnail */}
              {show.poster_url && (
                <div className="flex-shrink-0">
                  <Image
                    src={show.poster_url}
                    alt={`${show.name} poster`}
                    width={160}
                    height={240}
                    className="w-32 h-48 md:w-40 md:h-60 object-cover rounded-lg shadow-md"
                  />
                </div>
              )}
              
              {/* Show details */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {show.name}
                    </h1>
                    <p className="text-gray-600 mb-2">
                      {episodes.length} episode{episodes.length !== 1 ? 's' : ''} with subtitles
                    </p>
                    {show.first_aired && (
                      <p className="text-sm text-gray-500">
                        First aired: {new Date(show.first_aired).getFullYear()}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <Link
                      href={`/${generateShowSlug(show.name)}/edit`}
                      className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Show</span>
                    </Link>
                  )}
                </div>
                
                {/* Description */}
                {show.overview && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Description</h3>
                    <p className="text-gray-700 leading-relaxed">{show.overview}</p>
                  </div>
                )}
                
                {/* Additional info */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                  {show.network && (
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {show.network}
                    </span>
                  )}
                  {show.status && (
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {show.status}
                    </span>
                  )}
                  {show.genres && show.genres.length > 0 && (
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {show.genres.join(', ')}
                    </span>
                  )}
                </div>
                
                {/* Watch link */}
                {show.watch_url && (
                  <a
                    href={show.watch_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <span>Watch Show</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
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
                  href={`/${generateShowSlug(show.name)}/s${episode.season?.toString().padStart(2, '0')}e${episode.episode_number?.toString().padStart(2, '0')}`}
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
                            <ClientDate dateString={episode.lastExtraction} />
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