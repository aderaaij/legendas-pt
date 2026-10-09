/**
 * Subtitle content → cue blocks, shared by every extraction path. Pure.
 */
import {
  parseVTTWithTimestamps,
  parseSRTWithTimestamps,
  type SubtitleBlock,
} from "@/utils/subtitleUtils";

export interface SubtitleFormatHint {
  /** Original filename; its extension decides the format when `fileType` is absent. */
  filename?: string;
  fileType?: "vtt" | "srt" | "txt";
}

function detectFormat(
  content: string,
  { filename, fileType }: SubtitleFormatHint
): "vtt" | "srt" | null {
  if (fileType === "vtt" || filename?.endsWith(".vtt")) return "vtt";
  if (fileType === "srt" || filename?.endsWith(".srt")) return "srt";
  if (fileType === "txt") return null;
  // No hint (e.g. older extractions stored without a filename): sniff it.
  if (content.trimStart().startsWith("WEBVTT")) return "vtt";
  if (content.includes("-->")) return "srt";
  return null;
}

/**
 * Parse VTT/SRT into timed cue blocks. Returns null for plain text, or when
 * parsing fails or yields nothing — callers then fall back to the raw content.
 */
export function subtitleToBlocks(
  content: string,
  hint: SubtitleFormatHint = {}
): SubtitleBlock[] | null {
  const format = detectFormat(content, hint);
  if (!format) return null;
  try {
    const blocks =
      format === "vtt"
        ? parseVTTWithTimestamps(content)
        : parseSRTWithTimestamps(content);
    return blocks.length > 0 ? blocks : null;
  } catch (error) {
    console.warn("Failed to parse subtitle timestamps, using raw content:", error);
    return null;
  }
}
