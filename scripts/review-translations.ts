/**
 * Backfill the translation review for episodes extracted before it existed (or
 * re-review one episode). New imports are reviewed by the worker; this is the
 * catch-up path. Suggestions land as `pending` on the episode edit page.
 *
 *   npx tsx scripts/review-translations.ts                 # dry run: what would run
 *   npx tsx scripts/review-translations.ts --yes           # review every unreviewed episode
 *   npx tsx scripts/review-translations.ts --yes --limit 5
 *   npx tsx scripts/review-translations.ts --yes --extraction <id>   # re-review one
 *
 * Reads Supabase + ANTHROPIC_API_KEY from `.env.worker`. Needs
 * database/phrase_review.sql applied.
 */
// MUST be first: loads + validates `.env.worker` before the shared Supabase
// client reads process.env at import time (see worker/bootstrap.ts).
import "../worker/bootstrap";

import { parseArgs } from "node:util";

import { createServiceClient } from "@/lib/supabase-admin";
import { reviewExtraction } from "@/lib/phrase-review/review-extraction";
import { toTargetLanguage } from "@/lib/i18n/languages";

/** Measured with scripts/model-bakeoff.ts: Sonnet 5.5 review, Oct 2026. */
const ESTIMATED_COST_PER_EPISODE = 0.05;
const CONCURRENCY = 3;

type Row = {
  id: string;
  language: string | null;
  content_full: string | null;
  extraction_params: { filename?: string } | null;
};

async function main() {
  const { values } = parseArgs({
    options: {
      yes: { type: "boolean", default: false },
      limit: { type: "string" },
      extraction: { type: "string" },
    },
  });

  const db = createServiceClient();
  let query = db
    .from("phrase_extractions")
    .select("id")
    .not("content_full", "is", null)
    .not("episode_id", "is", null)
    .order("created_at", { ascending: false });
  query = values.extraction
    ? query.eq("id", values.extraction)
    : query.is("reviewed_at", null);
  if (values.limit) query = query.limit(Number(values.limit));
  const { data: ids, error } = await query;
  if (error) throw new Error(`Listing extractions failed: ${error.message}`);

  const count = ids?.length ?? 0;
  console.log(
    `${count} extraction(s) to review · about $${(count * ESTIMATED_COST_PER_EPISODE).toFixed(2)}`
  );
  if (!values.yes || !count) {
    if (count) console.log("Dry run — pass --yes to run.");
    return;
  }

  let next = 0;
  let flagged = 0;
  let failed = 0;
  const lanes = Array.from({ length: Math.min(CONCURRENCY, count) }, async () => {
    while (next < count) {
      const { id } = ids![next++];
      // One row at a time: content_full is the whole subtitle.
      const { data: row, error: rowError } = await db
        .from("phrase_extractions")
        .select("id, language, content_full, extraction_params")
        .eq("id", id)
        .single<Row>();
      if (rowError || !row?.content_full) {
        failed++;
        console.log(`  ✗ ${id} · ${rowError?.message ?? "no stored subtitle"}`);
        continue;
      }
      try {
        const pending = await reviewExtraction(db, {
          extractionId: row.id,
          language: toTargetLanguage(row.language),
          content: row.content_full,
          filename: row.extraction_params?.filename,
        });
        flagged += pending;
        console.log(`  ✓ ${id} · ${pending} to check`);
      } catch (err) {
        failed++;
        console.log(`  ✗ ${id} · ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });
  await Promise.all(lanes);
  console.log(`\nDone: ${flagged} suggestion(s) to check, ${failed} failed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
