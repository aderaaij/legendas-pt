"use client";

import { Show, Episode } from "@/lib/supabase";
import { generateShowSlug } from "@/utils/slugify";
import Breadcrumb from "@/app/components/common/Breadcrumb";

interface EpisodeEditHeaderProps {
  show: Show | null;
  episodeData: Episode | null;
}

/** Breadcrumb + title block for the episode edit page. */
export default function EpisodeEditHeader({
  show,
  episodeData,
}: EpisodeEditHeaderProps) {
  return (
    <div className="flex flex-col justify-between mb-8">
      <div className="flex flex-col gap-2">
        <Breadcrumb
          items={[
            { label: "Shows", href: "/" },
            {
              label: show?.name || "",
              href: `/${generateShowSlug(show!.name)}`,
            },
            {
              label: `S${episodeData?.season
                ?.toString()
                .padStart(2, "0")}E${episodeData?.episode_number
                ?.toString()
                .padStart(2, "0")}`,
              href: `/${generateShowSlug(show!.name)}/s${episodeData?.season
                ?.toString()
                .padStart(2, "0")}e${episodeData?.episode_number
                ?.toString()
                .padStart(2, "0")}`,
            },
            { label: "Edit", isCurrentPage: true },
          ]}
          className="mb-2"
        />

        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
            Edit {show?.name}
          </h1>
          {episodeData && (
            <p style={{ color: "var(--muted)" }}>
              Season {episodeData.season}, Episode {episodeData.episode_number}
              {episodeData.title && ` - ${episodeData.title}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
