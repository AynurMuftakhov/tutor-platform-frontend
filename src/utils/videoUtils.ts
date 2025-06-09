/**
 * Extracts the video ID from a YouTube URL
 * @param url YouTube URL
 * @returns Video ID or null if not a valid YouTube URL
 */
export const extractVideoId = (url: string): string | null => {
  if (!url) return null;
  
  // Handle youtu.be URLs
  if (url.includes('youtu.be')) {
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0];
  }
  
  // Handle youtube.com URLs
  if (url.includes('youtube.com')) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    return urlParams.get('v');
  }
  
  return null;
};