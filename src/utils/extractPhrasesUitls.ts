// Generate content hash for deduplication using a simple hash function
export const generateContentHash = (content: string): string => {
  // Handle empty or invalid content
  if (!content || content.length === 0) {
    console.warn('Empty content provided to generateContentHash');
    return 'empty_content_' + Date.now().toString(36);
  }

  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const hashString = Math.abs(hash).toString(36) + "_" + content.length;
  
  // Make sure we never return just "0" 
  if (hashString === "0" || hashString === "0_0") {
    return 'fallback_' + Date.now().toString(36) + '_' + content.length;
  }
  
  return hashString;
};

// Extract show/episode info from filename
export const parseShowInfo = (filename?: string) => {
  if (!filename)
    return {
      showName: "Unknown Show",
      season: undefined,
      episodeNumber: undefined,
      source: "",
    };

  // Try to parse common patterns like "Show.Name.S01E01.vtt" or "Show Name - 1x01.vtt"
  const seasonEpisodeMatch = filename.match(/[Ss](\d+)[Ee](\d+)|(\d+)x(\d+)/);
  const showNameMatch = filename
    .replace(/\.(vtt|srt)$/i, "")
    .replace(/[Ss]\d+[Ee]\d+|\d+x\d+.*/, "")
    .replace(/[._-]/g, " ")
    .trim();

  return {
    showName: showNameMatch || "Unknown Show",
    season: seasonEpisodeMatch
      ? parseInt(seasonEpisodeMatch[1] || seasonEpisodeMatch[3])
      : undefined,
    episodeNumber: seasonEpisodeMatch
      ? parseInt(seasonEpisodeMatch[2] || seasonEpisodeMatch[4])
      : undefined,
  };
};
