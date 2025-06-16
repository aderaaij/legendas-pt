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
import EpisodePageClient from "./components/EpisodePageClient";

type Props = {
  params: Promise<{ series: string; episode: string }>;
};

async function getEpisodeBySlug(seriesSlug: string, episodeSlug: string): Promise<{
  show: Show;
  episode: Episode;
  phrases: ExtractedPhrase[];
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

    // Load phrases for this episode
    const episodePhrases = await PhraseExtractionService.getPhrasesForEpisode(
      targetEpisode.id
    );

    return {
      show: matchingShow,
      episode: targetEpisode,
      phrases: episodePhrases,
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
  const { series, episode: episodeSlug } = await params;
  const data = await getEpisodeBySlug(series, episodeSlug);

  if (!data) {
    return {
      title: "Episode Not Found",
    };
  }

  const { show, episode } = data;

  return {
    title: `${show.name} S${episode.season}E${episode.episode_number} - Portuguese Phrases`,
    description: `Learn Portuguese phrases from ${show.name} Season ${episode.season} Episode ${episode.episode_number}${episode.title ? ` - ${episode.title}` : ""}. Interactive flashcards and spaced repetition learning.`,
    openGraph: {
      title: `${show.name} S${episode.season}E${episode.episode_number} - Portuguese Learning`,
      description: `Portuguese phrases from ${show.name} S${episode.season}E${episode.episode_number}`,
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

  const { show, episode, phrases } = data;

  return (
    <EpisodePageClient
      show={show}
      episode={episode}
      phrases={phrases}
      series={series}
      episodeSlug={episodeSlug}
    />
  );

}
