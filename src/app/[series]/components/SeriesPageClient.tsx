"use client";

import { FileText } from "lucide-react";

import { Show, Episode } from "@/lib/supabase";
import Breadcrumb from "@/app/components/Breadcrumb";
import { ShowInfoSection } from "./ShowInfoSection";
import { SeriesEpisodeCard } from "./SeriesEpisodeCard";

export type EpisodeWithStats = Episode & {
  extractionCount: number;
  totalPhrases: number;
  lastExtraction: string | null;
};

interface SeriesPageClientProps {
  show: Show;
  episodes: EpisodeWithStats[];
  series: string;
}

export default function SeriesPageClient({
  show,
  episodes,
}: SeriesPageClientProps) {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-red-200 to-green-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: "Shows", href: "/" },
              { label: show.name, isCurrentPage: true },
            ]}
            className="mb-6"
          />

          {/* Show info section */}
          <ShowInfoSection show={show} episodes={episodes} />
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
                <SeriesEpisodeCard
                  key={episode.id}
                  episode={episode}
                  show={show}
                />
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
              This show doesn&apos;t have any episodes with extracted phrases
              yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
