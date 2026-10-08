import { Metadata } from "next";
import { notFound } from "next/navigation";

import { PhraseExtractionService, Show, Episode } from "@/lib/supabase";
import { parseShowSlug, normalizeShowName, generateShowSlug } from "@/utils/slugify";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { toTargetLanguage } from "@/lib/i18n/languages";
import SeriesPageClient from "./components/SeriesPageClient";

type Props = {
  params: Promise<{ lang: string; series: string }>;
};

type EpisodeWithStats = Episode & { extractionCount: number; totalPhrases: number; lastExtraction: string | null };

// Regenerate in the background so shows/episodes added by the worker appear
// without a redeploy.
export const revalidate = 300;

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
  const { lang, series } = await params;
  // UI language (route) for the wording; the show's language for what's taught.
  const t = getDictionary(toTargetLanguage(lang)).show;
  const data = await getShowBySlug(series);
  
  if (!data) {
    return {
      title: t.notFound.title,
    };
  }

  const { show, episodes } = data;
  const contentLang = toTargetLanguage(show.language);
  const title = t.meta.title(show.name, contentLang);
  
  return {
    title,
    description: t.meta.description(show.name, contentLang, episodes.length),
    openGraph: {
      title,
      description: t.meta.ogDescription(show.name, contentLang, episodes.length),
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