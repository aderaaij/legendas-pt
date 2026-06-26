import { NextRequest, NextResponse } from "next/server";

import { createServiceClient, requireAdmin } from "@/lib/supabase-admin";

// A worker counts as online if its heartbeat is newer than this. The worker
// heartbeats every WORKER_HEARTBEAT_MS (default 20s), so 60s tolerates a couple
// of missed beats.
const ONLINE_THRESHOLD_MS = 60_000;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status }
    );
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("worker_status")
      .select("worker_id, hostname, last_seen_at")
      .order("last_seen_at", { ascending: false });

    if (error) {
      // Table not present (migration not applied) or transient — report the
      // feature as unavailable rather than failing the request.
      return NextResponse.json({ available: false, online: false, workers: [] });
    }

    const now = Date.now();
    const workers = (data ?? []).map((w) => ({
      worker_id: w.worker_id,
      hostname: w.hostname,
      last_seen_at: w.last_seen_at,
      online: now - new Date(w.last_seen_at).getTime() < ONLINE_THRESHOLD_MS,
    }));

    return NextResponse.json({
      available: true,
      online: workers.some((w) => w.online),
      lastSeenAt: data?.[0]?.last_seen_at ?? null,
      workers,
    });
  } catch {
    return NextResponse.json({ available: false, online: false, workers: [] });
  }
}
