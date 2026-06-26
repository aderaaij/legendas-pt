import { NextRequest, NextResponse } from "next/server";

import { PhraseExtractionService } from "@/lib/supabase";
import type { ExtractionJob } from "@/lib/supabase";
import { createServiceClient, requireAdmin } from "@/lib/supabase-admin";
import { isProvider, type Provider } from "@/lib/llm/types";
import type { ManualUploadResults } from "@/lib/manual-upload/types";

// Enqueue only — small (create a job, embed the content). No scraping/LLM here.
export const maxDuration = 60;

interface StartBody {
  content?: string;
  filename?: string;
  language?: string;
  source?: string;
  showName?: string;
  showId?: string | null;
  season?: number | null;
  episodeNumber?: number | null;
  episodeTitle?: string;
  provider?: string | null;
  model?: string | null;
  forceReExtraction?: boolean;
}

function inferFileType(filename?: string): "vtt" | "srt" | "txt" | undefined {
  if (!filename) return undefined;
  if (filename.endsWith(".vtt")) return "vtt";
  if (filename.endsWith(".srt")) return "srt";
  if (filename.endsWith(".txt")) return "txt";
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const {
      content,
      filename,
      language = "pt",
      source = "uploaded_file",
      showName,
      showId = null,
      season = null,
      episodeNumber = null,
      episodeTitle,
      provider = null,
      model = null,
      forceReExtraction = false,
    }: StartBody = await request.json();

    const auth = await requireAdmin(request.headers.get("authorization"));
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error.message },
        { status: auth.error.status }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    if (!showName) {
      return NextResponse.json({ error: "showName is required" }, { status: 400 });
    }
    if (provider && !isProvider(provider)) {
      return NextResponse.json(
        { error: `Unknown LLM provider: ${provider}` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const job = await PhraseExtractionService.createExtractionJob(
      auth.user.id,
      "manual_upload",
      showName,
      undefined,
      1,
      supabase
    );

    const results: ManualUploadResults = {
      plan: {
        content,
        filename,
        fileType: inferFileType(filename),
        language,
        source,
        showId,
        showName,
        season: season ?? undefined,
        episodeNumber: episodeNumber ?? undefined,
        episodeTitle,
        provider: (provider as Provider | null) ?? null,
        model: model ?? null,
        forceReExtraction,
      },
      status: "pending",
    };

    // Enqueue: mark 'queued' and return. The worker claims it and does the work.
    await PhraseExtractionService.updateExtractionJob(
      job.id,
      {
        status: "queued",
        progress: 0,
        results: results as unknown as ExtractionJob["results"],
      },
      supabase
    );

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    console.error("manual-upload/start error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
