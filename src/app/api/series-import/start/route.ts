import { NextRequest, NextResponse } from "next/server";

import { seriesSourceForUrl } from "@/lib/sources";
import { SERIES_SOURCES } from "@/lib/sources/meta";
import { PhraseExtractionService } from "@/lib/supabase";
import type { ExtractionJob } from "@/lib/supabase";
import { upsertShowRtpLink } from "@/lib/db/shows";
import { createServiceClient, requireAdmin } from "@/lib/supabase-admin";
import type { Provider } from "@/lib/llm/types";
import type {
  EpisodeState,
  ImportPlan,
  ImportResults,
  PlanEpisode,
} from "@/lib/series-import/types";

// Series scrape + job creation only — short. Per-episode work happens in the worker.
export const maxDuration = 60;

interface StartBody {
  url?: string;
  /** Season to import, for sources whose programs span several (RTVE). */
  seasonId?: string | null;
  saveToDatabase?: boolean;
  forceReExtraction?: boolean;
  selectedEpisodes?: number[] | null;
  selectedShowId?: string | null;
  season?: number | null;
  provider?: Provider | null;
  model?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const {
      url,
      seasonId = null,
      saveToDatabase = true,
      forceReExtraction = false,
      selectedEpisodes = null,
      selectedShowId = null,
      season = null,
      provider = null,
      model = null,
    }: StartBody = await request.json();

    const auth = await requireAdmin(request.headers.get("authorization"));
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error.message },
        { status: auth.error.status }
      );
    }

    if (!url) {
      return NextResponse.json(
        { error: "Series URL is required" },
        { status: 400 }
      );
    }
    const source = seriesSourceForUrl(url);
    if (!source) {
      const examples = Object.values(SERIES_SOURCES)
        .map((s) => s.exampleUrl)
        .join(" or ");
      return NextResponse.json(
        {
          error: `Unsupported series URL. Please provide a series URL like: ${examples}`,
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const series = await source.scrapeSeries(url, { seasonId });
    if (!series) {
      return NextResponse.json(
        { error: `Failed to fetch series data from ${source.meta.label}` },
        { status: 500 }
      );
    }

    const resolvedSeason = season ?? series.season ?? 1;
    const episodesToProcess =
      selectedEpisodes && Array.isArray(selectedEpisodes)
        ? series.episodes.filter((ep) =>
            selectedEpisodes.includes(ep.episodeNumber)
          )
        : series.episodes;

    if (episodesToProcess.length === 0) {
      return NextResponse.json(
        { error: "No episodes selected to import" },
        { status: 400 }
      );
    }

    const job = await PhraseExtractionService.createExtractionJob(
      auth.user.id,
      "rtp_series",
      series.title,
      series.url,
      episodesToProcess.length,
      supabase
    );

    const planEpisodes: PlanEpisode[] = episodesToProcess.map((ep) => ({
      episodeNumber: ep.episodeNumber,
      rtpId: ep.id,
      title: ep.title,
      url: ep.url,
      airDate: ep.airDate,
    }));

    const plan: ImportPlan = {
      source: series.source,
      showId: selectedShowId,
      season: resolvedSeason,
      seriesTitle: series.title,
      seriesUrl: series.url,
      saveToDatabase,
      forceReExtraction,
      provider,
      model,
      episodes: planEpisodes,
    };

    const nowIso = new Date().toISOString();
    const episodes: Record<string, EpisodeState> = {};
    for (const ep of planEpisodes) {
      episodes[String(ep.episodeNumber)] = {
        status: "pending",
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        updatedAt: nowIso,
      };
    }

    const results: ImportResults = {
      plan,
      episodes,
      summary: {
        total: planEpisodes.length,
        successful: 0,
        failed: 0,
        alreadyExists: 0,
        noSubtitle: 0,
      },
    };

    // Enqueue only: mark the job 'queued' and return. The persistent worker
    // claims it ('queued' → 'running') and runs the per-episode pipeline. Vercel
    // does no scraping/LLM work and never drives the loop.
    await PhraseExtractionService.updateExtractionJob(
      job.id,
      {
        status: "queued",
        progress: 0,
        results: results as unknown as ExtractionJob["results"],
      },
      supabase
    );

    // Record the program link for this show/season so the show page can link
    // back to RTP/RTVE. One entry per season (a show can span several program
    // pages). Best-effort: a failure here must not fail the import.
    if (selectedShowId) {
      try {
        await upsertShowRtpLink(supabase, selectedShowId, {
          url: series.url,
          season: resolvedSeason,
        });
      } catch (linkError) {
        console.error("Failed to record watch link for show:", linkError);
      }
    }

    return NextResponse.json({
      jobId: job.id,
      totalEpisodes: planEpisodes.length,
    });
  } catch (error) {
    console.error("series-import/start error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
