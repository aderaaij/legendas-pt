/**
 * Worker bootstrap. Importing this module (which MUST be the first import in
 * `index.ts`) loads `.env.worker` and validates the environment BEFORE anything
 * else runs.
 *
 * Why first: ES modules evaluate their imports top-to-bottom before the importing
 * module's body, and some shared libs (e.g. `@/lib/supabase-client`) build a
 * client from `process.env` at import time. Doing the load + validation here, as
 * the first evaluated import, guarantees the env is populated and checked before
 * those modules are imported — so a misconfigured deploy fails with a clear
 * message instead of a cryptic "supabaseUrl is required" deep in a dependency.
 *
 * In Docker there is no `.env.worker` file (Compose injects the env via
 * `env_file`), so a missing file is expected and ignored.
 */
import { loadWorkerEnv, type WorkerEnv } from "./env";

export const workerEnv: WorkerEnv = (() => {
  try {
    process.loadEnvFile(".env.worker");
  } catch {
    // No local .env.worker (e.g. in a container). Env comes from the process.
  }
  try {
    return loadWorkerEnv();
  } catch (err) {
    console.error(
      `[worker] startup error: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }
})();
