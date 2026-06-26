"use client";

import { useWorkerStatus } from "@/hooks/useWorkerStatus";

/**
 * Small admin-only badge showing whether an extraction worker is online. Hidden
 * until we have a definite answer (and when the worker_status table isn't
 * available, i.e. the migration hasn't been applied).
 */
export function WorkerStatusBadge() {
  const { online, available } = useWorkerStatus();

  if (!available || online === null) return null;

  const color = online ? "var(--green)" : "var(--accent2)";
  const title = online
    ? "An extraction worker is running — imports and uploads will be processed."
    : "No worker is responding — imports and uploads will queue until one comes online.";

  return (
    <div
      title={title}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--muted)" }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      Worker {online ? "online" : "offline"}
    </div>
  );
}
