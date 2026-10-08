import { NextRequest, NextResponse } from "next/server";
import { seriesSourceForUrl } from "@/lib/sources";
import { SERIES_SOURCES } from "@/lib/sources/meta";
import { requireAdmin } from "@/lib/supabase-admin";

interface PreviewBody {
  url?: string;
  /** Season to list, for sources whose programs span several (RTVE). */
  seasonId?: string | null;
}

const EXAMPLES = Object.values(SERIES_SOURCES)
  .map((s) => s.exampleUrl)
  .join(" or ");

export async function POST(request: NextRequest) {
  try {
    const { url, seasonId = null }: PreviewBody = await request.json();

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
      return NextResponse.json(
        {
          error: `Unsupported series URL. Please provide a series URL like: ${EXAMPLES}`,
        },
        { status: 400 }
      );
    }

    const series = await source.scrapeSeries(url, { seasonId });
    if (!series) {
      return NextResponse.json(
        { error: `Failed to fetch series data from ${source.meta.label}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, series });
  } catch (error) {
    console.error("Series preview error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
