import Link from "next/link";
import Image from "next/image";
import { Edit3, ExternalLink } from "lucide-react";

import { Show } from "@/lib/supabase";
import { generateShowSlug } from "@/utils/slugify";
import { useAuth } from "@/contexts/AuthContext";
import { EpisodeWithStats } from "./SeriesPageClient";

interface ShowInfoSectionProps {
  show: Show;
  episodes: EpisodeWithStats[];
}

export const ShowInfoSection = ({ show, episodes }: ShowInfoSectionProps) => {
  const { isAdmin } = useAuth();
  return (
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
                {episodes.length} episode{episodes.length !== 1 ? "s" : ""} with
                subtitles
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
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Description
              </h3>
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
                {show.genres.join(", ")}
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
  );
};
