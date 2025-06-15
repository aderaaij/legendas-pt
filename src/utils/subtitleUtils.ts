import { PhraseItem } from "@/app/components/AnkiExporter";

export const cleanSubtitleContent = (content: string): string => {

  if (!content || content.length === 0) {
    console.warn("No content provided to cleanSubtitleContent");
    return "";
  }

  // Handle different types of line breaks and separators
  const lines = content
    .split(/[\r\n]+|#\s*#/) // Split on line breaks or # # patterns
    .map((line) => line.replace(/^#+\s*|#+\s*$/g, "").trim()) // Remove leading/trailing #
    .filter((line) => line.length > 0);


  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    const isValid =
      trimmed.length > 0 &&
      !trimmed.includes("-->") &&
      !trimmed.includes("WEBVTT") &&
      !/^\d+$/.test(trimmed) &&
      // More permissive - allow lines with Portuguese content OR basic word characters
      (/[a-záàâãéèêíìîóòôõúùûçñA-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇÑ]/.test(trimmed) ||
        /[a-zA-Z]/.test(trimmed));
    return isValid;
  });


  const processedLines = filteredLines
    .map((line) => line.replace(/^[A-Z]+\s*:\s*/, "").trim()) // Remove speaker names
    .filter((line) => line.length > 3);


  const result = processedLines.join("\n");

  return result;
};

export const createFallbackPhrases = (
  subtitleContent: string
): PhraseItem[] => {
  const sentences = subtitleContent
    .split(/[.!?]+|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && !s.includes("#") && !s.includes("-->"))
    .slice(0, 20);

  return sentences.map(
    (sentence): PhraseItem => ({
      phrase: sentence.toLowerCase(),
      translation: `[Translation needed for: "${sentence}"]`,
      frequency: 1,
    })
  );
};

export const parseVTT = (content: string): string => {
  // Remove VTT header and metadata
  const lines = content.split("\n");
  const textLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines, timestamps, and metadata
    if (
      !trimmedLine ||
      trimmedLine.startsWith("WEBVTT") ||
      trimmedLine.includes("-->") ||
      /^\d+$/.test(trimmedLine)
    ) {
      continue;
    }

    // This is subtitle text
    if (trimmedLine && !trimmedLine.includes("-->")) {
      textLines.push(trimmedLine);
    }
  }

  return textLines.join(" ");
};

export const parseSRT = (content: string): string => {
  const lines = content.split("\n");
  const textLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip sequence numbers, timestamps, and empty lines
    if (
      !trimmedLine ||
      /^\d+$/.test(trimmedLine) ||
      trimmedLine.includes("-->")
    ) {
      continue;
    }

    textLines.push(trimmedLine);
  }

  return textLines.join(" ");
};
