import { PhraseItem } from "@/types/phrase";
import type { LlmSelection, Provider } from "@/lib/llm/types";

export interface PhraseExtractionApiResult {
  phrases: PhraseItem[];
  /** Provider + model the route actually used (resolved from override/env/default). */
  provider?: Provider;
  model?: string;
}

export const callPhraseExtractionAPI = async (
  content: string,
  selection?: Partial<LlmSelection>
): Promise<PhraseExtractionApiResult> => {
  const response = await fetch("/api/extract-phrases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      language: "portuguese",
      // Omit when unset so the route falls back to the env default.
      ...(selection?.provider ? { provider: selection.provider } : {}),
      ...(selection?.model ? { model: selection.model } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to extract phrases from API");
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error);
  }

  const phrases: PhraseItem[] = result.phrases.map(
    (item: {
      phrase: string;
      translation: string;
      frequency?: number;
    }): PhraseItem => ({
      phrase: item.phrase,
      translation: item.translation,
      frequency: item.frequency || 1,
    })
  );

  return { phrases, provider: result.provider, model: result.model };
};
