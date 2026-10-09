/**
 * Generate and store one episode's essentials: the worker's single entry point,
 * shared by the series import, manual upload and the backfill job. Holds the
 * LLM call, so it must only be imported by the worker.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { extractEssentialsFromSubtitle } from "@/lib/extractor";
import { ESSENTIALS_PROMPT_VERSION } from "@/lib/llm/extract-essentials";
import { saveEpisodeEssentials } from "@/lib/db/essentials";
import type { Provider } from "@/lib/llm/types";
import type { TargetLanguage } from "@/lib/i18n/languages";

export interface GenerateEpisodeEssentialsInput {
  episodeId: string;
  language: TargetLanguage;
  /** Raw subtitle text (VTT/SRT/plain). */
  content: string;
  filename?: string;
  fileType?: "vtt" | "srt" | "txt";
  provider?: Provider | null;
  model?: string | null;
}

/** Returns how many essentials the episode now has. Throws on any failure. */
export async function generateEpisodeEssentials(
  client: SupabaseClient,
  input: GenerateEpisodeEssentialsInput
): Promise<number> {
  const { episodeId, language, ...extractInput } = input;
  const { essentials, resolved } = await extractEssentialsFromSubtitle({
    ...extractInput,
    language,
  });
  return saveEpisodeEssentials(client, {
    episodeId,
    language,
    essentials,
    params: {
      provider: resolved.provider,
      model: resolved.model,
      promptVersion: ESSENTIALS_PROMPT_VERSION,
    },
  });
}
