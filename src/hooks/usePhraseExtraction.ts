import { useState, useCallback } from "react";

import { ExtractionSettings } from "@/app/upload/components/PhraseExtractor";
import { SubtitleMetadata } from "@/app/upload/page";
import { PhraseItem } from "@/types/phrase";
import { extractPhrasesFlow } from "@/utils/phraseExtractionFlow";

interface UsePhraseExtractionProps {
  settings: ExtractionSettings;
  fileName?: string;
  metadata: SubtitleMetadata | null;
}

/**
 * Thin React wrapper around the phrase-extraction flow: tracks the
 * `isExtracting` flag while delegating the actual work to `extractPhrasesFlow`.
 */
export const usePhraseExtraction = ({
  settings,
  fileName,
  metadata,
}: UsePhraseExtractionProps) => {
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtraction = useCallback(
    async (
      subtitleContent: string,
      onPhrasesExtracted: (phrases: PhraseItem[]) => void
    ) => {
      if (!subtitleContent) return;

      setIsExtracting(true);
      try {
        const phrases = await extractPhrasesFlow(subtitleContent, {
          settings,
          fileName,
          metadata,
        });
        onPhrasesExtracted(phrases);
      } catch (error) {
        console.error("Error extracting phrases:", error);
        throw error;
      } finally {
        setIsExtracting(false);
      }
    },
    [settings, fileName, metadata]
  );

  return {
    isExtracting,
    handleExtraction,
  };
};
