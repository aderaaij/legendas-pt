/**
 * Utility functions for handling and formatting timestamps
 */

/**
 * Format timestamp from "HH:MM:SS.mmm" to a human-readable format
 * @param timestamp - Timestamp in format "00:16:05.360"
 * @returns Formatted timestamp like "16:05" or "1:16:05" for longer videos
 */
export const formatTimestamp = (timestamp?: string): string => {
  if (!timestamp) return '';
  
  try {
    const [time] = timestamp.split('.');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    
    // For videos under 1 hour, show MM:SS
    if (hours === 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // For videos 1 hour or longer, show H:MM:SS
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } catch (error) {
    console.warn('Failed to format timestamp:', timestamp, error);
    return timestamp;
  }
};

/**
 * Format timestamp range from start and end times
 * @param startTime - Start timestamp "00:16:05.360"
 * @param endTime - End timestamp "00:16:08.640"
 * @returns Formatted range like "16:05-16:08" 
 */
export const formatTimestampRange = (startTime?: string, endTime?: string): string => {
  if (!startTime && !endTime) return '';
  if (!startTime) return formatTimestamp(endTime);
  if (!endTime) return formatTimestamp(startTime);
  
  const start = formatTimestamp(startTime);
  const end = formatTimestamp(endTime);
  
  return `${start}-${end}`;
};

/**
 * Convert timestamp to seconds for calculations
 * @param timestamp - Timestamp in format "00:16:05.360"
 * @returns Total seconds as a number
 */
export const timestampToSeconds = (timestamp?: string): number => {
  if (!timestamp) return 0;
  
  try {
    const [time, milliseconds = '0'] = timestamp.split('.');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    
    return hours * 3600 + minutes * 60 + seconds + Number(milliseconds) / 1000;
  } catch (error) {
    console.warn('Failed to convert timestamp to seconds:', timestamp, error);
    return 0;
  }
};

/**
 * Check if a timestamp is valid
 * @param timestamp - Timestamp to validate
 * @returns True if timestamp is in valid format
 */
export const isValidTimestamp = (timestamp?: string): boolean => {
  if (!timestamp) return false;
  
  const timestampRegex = /^\d{1,2}:\d{2}:\d{2}(\.\d{3})?$/;
  return timestampRegex.test(timestamp);
};