/**
 * Validate the worker's runtime environment. Fails fast with a clear message so a
 * misconfigured deploy never silently no-ops.
 */
import { PROVIDERS, API_KEY_ENV } from "@/lib/llm/types";

export interface WorkerEnv {
  pollIntervalMs: number;
}

export function loadWorkerEnv(): WorkerEnv {
  // `NEXT_PUBLIC_SUPABASE_ANON_KEY` is required only because a shared lib builds
  // the public client at import; the worker itself writes with the service-role
  // key (`SUPABASE_SECRET_KEY`).
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SECRET_KEY",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`
    );
  }

  // At least one LLM provider key must be present (OpenAI is the default).
  const hasAnyLlmKey = PROVIDERS.some((p) => process.env[API_KEY_ENV[p]]);
  if (!hasAnyLlmKey) {
    const keyNames = PROVIDERS.map((p) => API_KEY_ENV[p]).join(", ");
    throw new Error(
      `No LLM API key configured. Set at least one of: ${keyNames}`
    );
  }

  const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS) || 5000;

  return { pollIntervalMs };
}
