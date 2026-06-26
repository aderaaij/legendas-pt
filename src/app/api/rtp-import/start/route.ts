import { NextRequest, NextResponse } from "next/server";

import RTPScraperService from "@/lib/rtp-scraper";
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
} from "@/lib/rtp-import/types";

// Series scrape + job creation only — short. Per-episode work happens in /step.
export const maxDuration = 60;

interface StartBody {
  rtpUrl?: string;
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
      rtpUrl,
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

    if (!rtpUrl) {
      return NextResponse.json({ error: "RTP URL is required" }, { status: 400 });
    }
    if (!RTPScraperService.parseRTPUrl(rtpUrl).isValid) {
      return NextResponse.json(
        {
          error:
            "Invalid RTP URL format. Please provide a series URL like: https://www.rtp.pt/play/p14147/o-americano",
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const series = await RTPScraperService.scrapeSeries(rtpUrl);
    if (!series) {
      return NextResponse.json(
        { error: "Failed to scrape series data from RTP" },
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
      rtpUrl,
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
      showId: selectedShowId,
      season: resolvedSeason,
      seriesTitle: series.title,
      seriesUrl: rtpUrl,
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

    // Record the RTP program link for this show/season so the show page can link
    // back to RTP. One entry per season (a show can span several program pages).
    // Best-effort: a failure here must not fail the import.
    if (selectedShowId) {
      try {
        const canonical = RTPScraperService.canonicalSeriesUrl(rtpUrl);
        await upsertShowRtpLink(supabase, selectedShowId, {
          url: canonical?.url ?? rtpUrl,
          season: resolvedSeason,
        });
      } catch (linkError) {
        console.error("Failed to record RTP link for show:", linkError);
      }
    }

    return NextResponse.json({
      jobId: job.id,
      totalEpisodes: planEpisodes.length,
    });
  } catch (error) {
    console.error("rtp-import/start error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
