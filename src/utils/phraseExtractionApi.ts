import { PhraseItem } from "@/app/components/AnkiExporter";

export const callPhraseExtractionAPI = async (
  content: string
): Promise<PhraseItem[]> => {
  const response = await fetch("/api/extract-phrases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      language: "portuguese",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to extract phrases from API");
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error);
  }

  return result.phrases.map(
    (item: any): PhraseItem => ({
      phrase: item.phrase,
      translation: item.translation,
      frequency: item.frequency || 1,
    })
  );
};
