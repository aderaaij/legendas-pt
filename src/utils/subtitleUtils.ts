export interface SubtitleBlock {
  text: string;
  startTime: string;
  endTime: string;
  index: number;
  speaker?: string;
}

export interface PhraseWithTimestamp {
  phrase: string;
  translation: string;
  startTime?: string;
  endTime?: string;
  speaker?: string;
  matchedConfidence?: number;
}

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

// Strip WebVTT cue markup (<c.vtt_cyan>, <i>, <v Name>, inline timestamps) and
// the few entities broadcaster files use, leaving the spoken text.
const stripCueMarkup = (text: string): string =>
  text
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

export const parseVTTWithTimestamps = (content: string): SubtitleBlock[] => {
  const lines = content.split("\n");
  const blocks: SubtitleBlock[] = [];
  // The cue being read: a timing line followed by one or more text lines, up
  // to the next blank line.
  let cue: { startTime: string; endTime: string; lines: string[] } | null =
    null;

  const flushCue = () => {
    if (cue && cue.lines.length > 0) {
      const text = cue.lines.join(" ");
      // Extract speaker if present (e.g., "HOMEM: Text here")
      const speakerMatch = text.match(/^([A-Z]+)\s*:\s*(.+)/);
      blocks.push({
        text: speakerMatch ? speakerMatch[2].trim() : text,
        startTime: cue.startTime,
        endTime: cue.endTime,
        index: blocks.length,
        speaker: speakerMatch?.[1],
      });
    }
    cue = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushCue();
      continue;
    }

    // Timing line (e.g., "00:16:05.360 --> 00:16:08.640 line:85%") starts a cue
    const timestampMatch = line.match(
      /^(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/
    );
    if (timestampMatch) {
      flushCue();
      cue = {
        startTime: timestampMatch[1],
        endTime: timestampMatch[2],
        lines: [],
      };
      continue;
    }

    // Outside a cue: the WEBVTT header, cue identifiers, NOTE/STYLE blocks
    if (!cue) continue;

    const text = stripCueMarkup(line);
    if (text) cue.lines.push(text);
  }
  flushCue();

  return blocks;
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

export const parseSRTWithTimestamps = (content: string): SubtitleBlock[] => {
  const lines = content.split("\n");
  const blocks: SubtitleBlock[] = [];
  let currentBlock: Partial<SubtitleBlock> = {};
  let expectingTimestamp = false;
  let blockIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      continue;
    }

    // Check for sequence number
    if (/^\d+$/.test(line)) {
      expectingTimestamp = true;
      currentBlock.index = blockIndex++;
      continue;
    }

    // Check for timestamp line (e.g., "00:16:05,360 --> 00:16:08,640")
    if (expectingTimestamp) {
      const timestampMatch = line.match(/^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
      if (timestampMatch) {
        // Convert comma to dot for consistency with VTT format
        currentBlock.startTime = timestampMatch[1].replace(',', '.');
        currentBlock.endTime = timestampMatch[2].replace(',', '.');
        expectingTimestamp = false;
        continue;
      }
    }

    // This should be subtitle text
    if (currentBlock.startTime && currentBlock.endTime) {
      // Extract speaker if present
      const speakerMatch = line.match(/^([A-Z]+)\s*:\s*(.+)/);
      if (speakerMatch) {
        currentBlock.speaker = speakerMatch[1];
        currentBlock.text = (currentBlock.text || '') + ' ' + speakerMatch[2].trim();
      } else {
        currentBlock.text = (currentBlock.text || '') + ' ' + line;
      }
    }

    // Check if this is the end of a subtitle block (next line is empty or sequence number)
    const nextLine = lines[i + 1]?.trim();
    if ((!nextLine || /^\d+$/.test(nextLine)) && currentBlock.text && currentBlock.startTime && currentBlock.endTime) {
      blocks.push({
        text: currentBlock.text.trim(),
        startTime: currentBlock.startTime,
        endTime: currentBlock.endTime,
        index: currentBlock.index!,
        speaker: currentBlock.speaker
      });

      // Reset for next block
      currentBlock = {};
    }
  }

  return blocks;
};

// Function to match extracted phrases back to their original timestamped blocks
export const matchPhrasesToTimestamps = (
  extractedPhrases: Array<{ phrase: string; translation: string }>,
  originalBlocks: SubtitleBlock[]
): PhraseWithTimestamp[] => {
  const phrasesWithTimestamps: PhraseWithTimestamp[] = [];

  for (const extractedPhrase of extractedPhrases) {
    const phrase = extractedPhrase.phrase.toLowerCase().trim();
    let bestMatch: SubtitleBlock | null = null;
    let bestScore = 0;

    // Try to find the best matching block for this phrase
    for (const block of originalBlocks) {
      const blockText = block.text.toLowerCase().trim();
      
      // Calculate similarity score
      let score = 0;
      
      // Exact match gets highest score
      if (blockText.includes(phrase)) {
        score = 1.0;
      } else {
        // Calculate word overlap for partial matches
        const phraseWords = phrase.split(/\s+/);
        const blockWords = blockText.split(/\s+/);
        const commonWords = phraseWords.filter(word => 
          blockWords.some(blockWord => blockWord.includes(word) || word.includes(blockWord))
        );
        score = commonWords.length / phraseWords.length;
      }

      if (score > bestScore && score > 0.5) { // Minimum 50% match confidence
        bestScore = score;
        bestMatch = block;
      }
    }

    // Create the phrase with timestamp info
    const phraseWithTimestamp: PhraseWithTimestamp = {
      phrase: extractedPhrase.phrase,
      translation: extractedPhrase.translation,
      matchedConfidence: bestScore
    };

    if (bestMatch) {
      phraseWithTimestamp.startTime = bestMatch.startTime;
      phraseWithTimestamp.endTime = bestMatch.endTime;
      phraseWithTimestamp.speaker = bestMatch.speaker;
    }

    phrasesWithTimestamps.push(phraseWithTimestamp);
  }

  return phrasesWithTimestamps;
};
