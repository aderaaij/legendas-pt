import { NextRequest, NextResponse } from "next/server";

import { PhraseExtractionService } from "@/lib/supabase";
import type { ExtractionJob } from "@/lib/supabase";
import { createServiceClient, requireAdmin } from "@/lib/supabase-admin";
import { processEpisode } from "@/lib/rtp-import/process-episode";
import {
  TERMINAL_STATUSES,
  type EpisodeState,
  type EpisodeStep,
  type ImportResults,
  type ImportSummary,
} from "@/lib/rtp-import/types";

// One episode = one subtitle fetch + one LLM call; allow generous headroom.
// (Vercel Hobby caps at 60s regardless; Pro honours this.)
export const maxDuration = 300;

const STEP_LABELS: Record<EpisodeStep, string> = {
  scraping: "Scraping subtitle",
  extracting: "Extracting phrases",
  saving: "Saving",
};

function computeSummary(
  episodes: Record<string, EpisodeState>,
  total: number
): ImportSummary {
  const vals = Object.values(episodes);
  return {
    total,
    successful: vals.filter((e) => e.status === "success").length,
    failed: vals.filter(
      (e) => e.status === "error" || e.status === "extraction_failed"
    ).length,
    alreadyExists: vals.filter((e) => e.status === "already_exists").length,
    noSubtitle: vals.filter((e) => e.status === "no_subtitle").length,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();
    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const auth = await requireAdmin(request.headers.get("authorization"));
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error.message },
        { status: auth.error.status }
      );
    }

    const supabase = createServiceClient();
    const job = await PhraseExtractionService.getExtractionJob(jobId, supabase);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.user_id !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (job.status === "cancelled") {
      return NextResponse.json({ done: true, cancelled: true });
    }
    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json({ done: true });
    }

    const results = job.results as unknown as ImportResults | undefined;
    if (!results?.plan) {
      return NextResponse.json(
        { error: "Job has no import plan" },
        { status: 400 }
      );
    }

    const { plan } = results;
    const episodes: Record<string, EpisodeState> = { ...(results.episodes ?? {}) };
    const total = plan.episodes.length;

    // Pick the next episode that hasn't reached a terminal status.
    const next = plan.episodes.find((ep) => {
      const st = episodes[String(ep.episodeNumber)]?.status ?? "pending";
      return !TERMINAL_STATUSES.has(st);
    });

    // None left → finalize the job.
    if (!next) {
      const summary = computeSummary(episodes, total);
      const completed = summary.successful + summary.alreadyExists;
      const failed = summary.failed + summary.noSubtitle;
      const finalStatus = failed === 0 || completed > 0 ? "completed" : "failed";
      await PhraseExtractionService.updateExtractionJob(
        jobId,
        {
          status: finalStatus,
          progress: 100,
          completed_episodes: completed,
          failed_episodes: failed,
          results: { ...results, episodes, summary } as unknown as ExtractionJob["results"],
          completed_at: new Date().toISOString(),
        },
        supabase
      );
      return NextResponse.json({ done: true, progress: 100 });
    }

    const key = String(next.episodeNumber);

    // Persist an in-flight sub-stage so polling shows "what it's doing".
    const writeStep = async (step: EpisodeStep) => {
      episodes[key] = {
        episodeNumber: next.episodeNumber,
        title: next.title,
        status: step,
        updatedAt: new Date().toISOString(),
      };
      await PhraseExtractionService.updateExtractionJob(
        jobId,
        {
          current_episode: `Ep. ${next.episodeNumber}: ${next.title} — ${STEP_LABELS[step]}`,
          results: { ...results, episodes } as unknown as ExtractionJob["results"],
        },
        supabase
      );
    };

    const outcome = await processEpisode({
      supabase,
      origin: request.nextUrl.origin,
      episode: next,
      showId: plan.showId,
      season: plan.season,
      seriesTitle: plan.seriesTitle,
      saveToDatabase: plan.saveToDatabase,
      forceReExtraction: plan.forceReExtraction,
      provider: plan.provider,
      model: plan.model,
      onStep: writeStep,
    });

    // Record the terminal outcome for this episode.
    episodes[key] = {
      episodeNumber: next.episodeNumber,
      title: next.title,
      status: outcome.status,
      phraseCount: outcome.phraseCount,
      extractionId: outcome.extractionId,
      error: outcome.error,
      updatedAt: new Date().toISOString(),
    };

    const summary = computeSummary(episodes, total);
    const completed = summary.successful + summary.alreadyExists;
    const failed = summary.failed + summary.noSubtitle;
    const progress = Math.round(((completed + failed) / total) * 100);

    await PhraseExtractionService.updateExtractionJob(
      jobId,
      {
        progress,
        completed_episodes: completed,
        failed_episodes: failed,
        current_episode: `Ep. ${next.episodeNumber}: ${next.title}`,
        results: { ...results, episodes, summary } as unknown as ExtractionJob["results"],
      },
      supabase
    );

    return NextResponse.json({
      done: false,
      progress,
      episodeResult: {
        episodeNumber: next.episodeNumber,
        status: outcome.status,
        phraseCount: outcome.phraseCount,
        error: outcome.error,
      },
    });
  } catch (error) {
    console.error("rtp-import/step error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
