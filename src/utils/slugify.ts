// Normalize Portuguese characters to ASCII equivalents
function normalizePortugueseText(text: string): string {
  const charMap: { [key: string]: string } = {
    'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'ç': 'c',
    'ñ': 'n',
    'Á': 'A', 'À': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A',
    'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
    'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
    'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
    'Ç': 'C',
    'Ñ': 'N'
  };

  return text.replace(/[áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ]/g, (match) => {
    return charMap[match] || match;
  });
}

export function generateShowSlug(showName: string, season?: number, episodeNumber?: number): string {
  // Convert show name to URL-friendly slug
  let slug = normalizePortugueseText(showName)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  // Add season and episode if available
  if (season && episodeNumber) {
    slug += `-s${season.toString().padStart(2, '0')}e${episodeNumber.toString().padStart(2, '0')}`;
  } else if (season) {
    slug += `-s${season.toString().padStart(2, '0')}`;
  }

  return slug;
}

export function parseShowSlug(slug: string): {
  showName: string;
  season?: number;
  episodeNumber?: number;
} {
  // Extract season/episode pattern
  const seasonEpisodeMatch = slug.match(/-s(\d+)(?:e(\d+))?$/);
  
  let showName = slug;
  let season: number | undefined;
  let episodeNumber: number | undefined;

  if (seasonEpisodeMatch) {
    // Remove season/episode from show name
    showName = slug.replace(/-s\d+(?:e\d+)?$/, '');
    season = parseInt(seasonEpisodeMatch[1]);
    episodeNumber = seasonEpisodeMatch[2] ? parseInt(seasonEpisodeMatch[2]) : undefined;
  }

  // Convert slug back to readable name
  showName = showName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return { showName, season, episodeNumber };
}

// Export the normalize function for use in other parts of the app
export { normalizePortugueseText };

// Normalize show name for comparison and searching
export function normalizeShowName(showName: string): string {
  return normalizePortugueseText(showName)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}