import { Metadata } from "next";
import { notFound } from "next/navigation";

import { PhraseExtractionService, Show, Episode } from "@/lib/supabase";
import { parseShowSlug, normalizeShowName, generateShowSlug } from "@/utils/slugify";
import SeriesPageClient from "./components/SeriesPageClient";

type Props = {
  params: Promise<{ series: string }>;
};

type EpisodeWithStats = Episode & { extractionCount: number; totalPhrases: number; lastExtraction: string | null };

async function getShowBySlug(slug: string): Promise<{ show: Show; episodes: EpisodeWithStats[] } | null> {
  try {
    // Parse the series slug to get show information
    const parsedSlug = parseShowSlug(slug);

    // Find the actual show in the database
    const shows = await PhraseExtractionService.getAllShows();
    const normalizedSlugName = normalizeShowName(parsedSlug.showName);
    
    const matchingShow = shows.find(s => 
      normalizeShowName(s.name) === normalizedSlugName ||
      normalizeShowName(s.name).includes(normalizedSlugName) ||
      normalizedSlugName.includes(normalizeShowName(s.name))
    );

    if (!matchingShow) {
      return null;
    }

    // Load episodes for this show
    const episodes = await PhraseExtractionService.getEpisodesWithExtractionStats(matchingShow.id);
    
    return { show: matchingShow, episodes };
  } catch (err) {
    console.error("Error loading show data:", err);
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const shows = await PhraseExtractionService.getAllShows();
    return shows.map(show => ({
      series: generateShowSlug(show.name)
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series } = await params;
  const data = await getShowBySlug(series);
  
  if (!data) {
    return {
      title: "Show Not Found",
    };
  }

  const { show, episodes } = data;
  
  return {
    title: `${show.name} - Portuguese Phrases`,
    description: `Learn Portuguese with phrases from ${show.name}. ${episodes.length} episodes available with extracted phrases for language learning.`,
    openGraph: {
      title: `${show.name} - Portuguese Phrases`,
      description: `Learn Portuguese with phrases from ${show.name}. ${episodes.length} episodes available.`,
      type: "website",
    },
  };
}

export default async function SeriesPage({ params }: Props) {
  const { series } = await params;
  const data = await getShowBySlug(series);
  
  if (!data) {
    notFound();
  }

  const { show, episodes } = data;

  return (
    <SeriesPageClient 
      show={show} 
      episodes={episodes} 
      series={series}
    />
  );

}