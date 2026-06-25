// Barrel for the Supabase data layer.
//
// The implementation lives in focused per-domain modules under `./db/*`; this
// file wires them together and preserves the historical public surface so
// existing imports (`@/lib/supabase`) keep working:
//   - the `supabase` client
//   - the database types (Show, Episode, ExtractedPhrase, ...)
//   - the `PhraseExtractionService` facade aggregating every db function
export { supabase } from "./supabase-client";
export * from "@/types/database";

import * as shows from "./db/shows";
import * as episodes from "./db/episodes";
import * as extractions from "./db/extractions";
import * as phrases from "./db/phrases";
import * as jobs from "./db/extraction-jobs";
import * as stats from "./db/stats";
import * as dedup from "./db/dedup";

export const PhraseExtractionService = {
  ...shows,
  ...episodes,
  ...extractions,
  ...phrases,
  ...jobs,
  ...stats,
  ...dedup,
};
