/**
 * Utility function to decode HTML entities
 * Converts HTML entities like &ocirc; to their proper characters like ô
 */
export const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};