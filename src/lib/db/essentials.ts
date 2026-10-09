// Episode Essentials persistence (database/essentials.sql).
//
// Framework-free like the other db modules, and deliberately free of runtime
// imports from `@/lib/llm` so the Next bundle (which reads essentials for the
// episode page) never pulls in the AI SDK — the worker passes LLM metadata in.
import { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase-client";
import { toTargetLanguage, type TargetLanguage } from "@/lib/i18n/languages";
import { normalizeExpression } from "@/lib/essentials/normalize";
import type { EssentialCandidate } from "@/lib/llm/extract-essentials";
import type { EpisodeEssential } from "@/types/essentials";

interface EpisodeEssentialRow {
  rank: number;
  translation: string;
  example: string | null;
  example_translation: string | null;
  essential: {
    id: string;
    expression: string;
    translation: string;
    note: string | null;
  } | null;
}

/**
 * An episode's essentials, most important first. Never throws: the episode page
 * treats any loader error as a 404, so a missing table or a transient failure
 * here must degrade to "no essentials" rather than take the page down.
 */
export async function getEpisodeEssentials(
  episodeId: string,
  client: SupabaseClient = supabase
): Promise<EpisodeEssential[]> {
  const { data, error } = await client
    .from("episode_essentials")
    .select(
      "rank, translation, example, example_translation, essential:essentials(id, expression, translation, note)"
    )
    .eq("episode_id", episodeId)
    .order("rank", { ascending: true });

  if (error) {
    console.error("Error loading episode essentials:", error);
    return [];
  }

  return ((data ?? []) as unknown as EpisodeEssentialRow[])
    .filter((row) => row.essential)
    .map((row) => ({
      id: row.essential!.id,
      expression: row.essential!.expression,
      translation: row.translation || row.essential!.translation,
      note: row.essential!.note,
      example: row.example,
      exampleTranslation: row.example_translation,
      rank: row.rank,
    }));
}

export interface SaveEpisodeEssentialsInput {
  episodeId: string;
  language: TargetLanguage;
  /** Ranked candidates, most important first. */
  essentials: EssentialCandidate[];
  /** Recorded on the episode (provider, model, prompt version). */
  params: Record<string, unknown>;
}

/**
 * Replace an episode's essentials. Lexicon rows are insert-only (first writer
 * wins), so an item's meaning — and the progress stored against it — stays
 * stable; the per-episode meaning lives on the link row. The links are upserted
 * then pruned, so the episode never goes empty mid-write. Returns the count.
 *
 * Requires a service-role client (content tables have no write policies).
 */
export async function saveEpisodeEssentials(
  client: SupabaseClient,
  { episodeId, language, essentials, params }: SaveEpisodeEssentialsInput
): Promise<number> {
  // Normalize + dedupe, keeping the first (highest-ranked) occurrence.
  const byKey = new Map<string, EssentialCandidate>();
  for (const item of essentials) {
    const key = normalizeExpression(item.expression, language);
    if (key && !byKey.has(key)) byKey.set(key, item);
  }
  if (byKey.size === 0) {
    throw new Error("The model returned no usable essentials");
  }
  const keys = [...byKey.keys()];

  const { error: lexiconError } = await client.from("essentials").upsert(
    keys.map((key) => {
      const item = byKey.get(key)!;
      return {
        language,
        normalized_key: key,
        expression: item.expression.trim(),
        translation: item.translation.trim(),
        note: item.note?.trim() || null,
      };
    }),
    { onConflict: "language,normalized_key", ignoreDuplicates: true }
  );
  if (lexiconError) throw new Error(`Saving essentials failed: ${lexiconError.message}`);

  // ON CONFLICT DO NOTHING returns only the inserted rows, so look all ids up.
  const { data: lexicon, error: lookupError } = await client
    .from("essentials")
    .select("id, normalized_key")
    .eq("language", language)
    .in("normalized_key", keys);
  if (lookupError) throw new Error(`Loading essentials failed: ${lookupError.message}`);
  const idByKey = new Map(
    (lexicon ?? []).map((row) => [row.normalized_key as string, row.id as string])
  );

  const links = keys
    .filter((key) => idByKey.has(key))
    .map((key, index) => {
      const item = byKey.get(key)!;
      return {
        episode_id: episodeId,
        essential_id: idByKey.get(key)!,
        rank: index + 1,
        translation: item.translation.trim(),
        example: item.example?.trim() || null,
        example_translation: item.exampleTranslation?.trim() || null,
      };
    });
  if (links.length === 0) {
    throw new Error("Saved essentials could not be found again");
  }

  const { error: linkError } = await client
    .from("episode_essentials")
    .upsert(links, { onConflict: "episode_id,essential_id" });
  if (linkError) throw new Error(`Linking essentials failed: ${linkError.message}`);

  const keepIds = links.map((link) => link.essential_id);
  const { error: pruneError } = await client
    .from("episode_essentials")
    .delete()
    .eq("episode_id", episodeId)
    .not("essential_id", "in", `(${keepIds.join(",")})`);
  if (pruneError) throw new Error(`Pruning essentials failed: ${pruneError.message}`);

  const { error: episodeError } = await client
    .from("episodes")
    .update({
      essentials_generated_at: new Date().toISOString(),
      essentials_params: params,
    })
    .eq("id", episodeId);
  if (episodeError) throw new Error(`Updating episode failed: ${episodeError.message}`);

  return links.length;
}

export interface EssentialsSource {
  content: string;
  filename?: string;
  language: TargetLanguage;
}

/**
 * The subtitle to pick an episode's essentials from: its latest extraction's
 * stored raw content. Null when the episode has no extraction with content.
 */
export async function loadEssentialsSource(
  client: SupabaseClient,
  episodeId: string
): Promise<EssentialsSource | null> {
  const { data, error } = await client
    .from("phrase_extractions")
    .select("content_full, extraction_params, language")
    .eq("episode_id", episodeId)
    .not("content_full", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`Loading extraction failed: ${error.message}`);

  const extraction = data?.[0];
  if (!extraction?.content_full) return null;

  const filename = (extraction.extraction_params as { filename?: unknown } | null)
    ?.filename;
  return {
    content: extraction.content_full,
    filename: typeof filename === "string" ? filename : undefined,
    language: toTargetLanguage(extraction.language),
  };
}
