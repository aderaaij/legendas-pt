import { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  PhraseExtractionService,
  ExtractedPhrase,
  Show,
  Episode,
} from "@/lib/supabase";
import {
  parseShowSlug,
  normalizeShowName,
  generateShowSlug,
} from "@/utils/slugify";
import { getEpisodeEssentials } from "@/lib/db/essentials";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { EpisodeEssential } from "@/types/essentials";
import { toTargetLanguage } from "@/lib/i18n/languages";
import EpisodePageClient from "./components/EpisodePageClient";

type Props = {
  params: Promise<{ lang: string; series: string; episode: string }>;
};

// Regenerate in the background so phrases added by the worker appear without a
// redeploy.
export const revalidate = 300;

async function getEpisodeBySlug(seriesSlug: string, episodeSlug: string): Promise<{
  show: Show;
  episode: Episode;
  phrases: ExtractedPhrase[];
  essentials: EpisodeEssential[];
} | null> {
  try {
    // Parse the series slug to get show information
    const parsedSeriesSlug = parseShowSlug(seriesSlug);

    // Parse the episode slug (e.g., "s01e01")
    const episodeMatch = episodeSlug.match(/^s(\d+)e(\d+)$/i);
    if (!episodeMatch) {
      return null;
    }

    const season = parseInt(episodeMatch[1]);
    const episodeNumber = parseInt(episodeMatch[2]);

    // Find the actual show in the database
    const shows = await PhraseExtractionService.getAllShows();
    const normalizedSlugName = normalizeShowName(parsedSeriesSlug.showName);

    const matchingShow = shows.find(
      (s) =>
        normalizeShowName(s.name) === normalizedSlugName ||
        normalizeShowName(s.name).includes(normalizedSlugName) ||
        normalizedSlugName.includes(normalizeShowName(s.name))
    );

    if (!matchingShow) {
      return null;
    }

    // Find the specific episode
    const allEpisodes = await PhraseExtractionService.getEpisodesForShow(
      matchingShow.id
    );
    const targetEpisode = allEpisodes.find(
      (ep) => ep.season === season && ep.episode_number === episodeNumber
    );

    if (!targetEpisode) {
      return null;
    }

    // Load phrases and essentials (the latter never throws — see its docs).
    const [episodePhrases, essentials] = await Promise.all([
      PhraseExtractionService.getPhrasesForEpisode(targetEpisode.id),
      getEpisodeEssentials(targetEpisode.id),
    ]);

    return {
      show: matchingShow,
      episode: targetEpisode,
      phrases: episodePhrases,
      essentials,
    };
  } catch (err) {
    console.error("Error loading episode data:", err);
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const shows = await PhraseExtractionService.getAllShows();
    const staticParams: { series: string; episode: string }[] = [];

    for (const show of shows) {
      const episodes = await PhraseExtractionService.getEpisodesForShow(show.id);
      episodes.forEach((episode) => {
        staticParams.push({
          series: generateShowSlug(show.name),
          episode: `s${episode.season?.toString().padStart(2, "0")}e${episode.episode_number?.toString().padStart(2, "0")}`,
        });
      });
    }

    return staticParams;
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, series, episode: episodeSlug } = await params;
  // UI language (route) for the wording; the show's language for what's taught.
  const t = getDictionary(toTargetLanguage(lang)).episode;
  const data = await getEpisodeBySlug(series, episodeSlug);

  if (!data) {
    return {
      title: t.notFound.title,
    };
  }

  const { show, episode } = data;
  const contentLang = toTargetLanguage(show.language);
  const code = `S${episode.season}E${episode.episode_number}`;

  return {
    title: t.meta.title(show.name, code, contentLang),
    description: t.meta.description({
      show: show.name,
      language: contentLang,
      season: episode.season,
      episode: episode.episode_number,
      title: episode.title,
    }),
    openGraph: {
      title: t.meta.ogTitle(show.name, code, contentLang),
      description: t.meta.ogDescription(show.name, code, contentLang),
      type: "website",
    },
  };
}

export default async function EpisodePage({ params }: Props) {
  const { series, episode: episodeSlug } = await params;
  const data = await getEpisodeBySlug(series, episodeSlug);

  if (!data) {
    notFound();
  }

  const { show, episode, phrases, essentials } = data;

  return (
    <EpisodePageClient
      show={show}
      episode={episode}
      phrases={phrases}
      essentials={essentials}
      series={series}
      episodeSlug={episodeSlug}
    />
  );

}
