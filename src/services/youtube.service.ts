import type { YouTubeVideo } from '@/store/youtube.store';

/**
 * Extracts YouTube Video ID from any format:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - Raw 11-char ID
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const clean = urlOrId.trim();

  // If already an 11-character ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // Regex for YouTube URLs
  const regExp =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = clean.match(regExp);
  return match ? match[1] : null;
}

/**
 * Fetch video metadata via public oEmbed API without requiring any YouTube API key.
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<Partial<YouTubeVideo> | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: videoId,
      title: data.title || 'YouTube Video',
      channel: data.author_name || 'YouTube Creator',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return {
      id: videoId,
      title: `YouTube Video (${videoId})`,
      channel: 'YouTube',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}

/**
 * Live search real YouTube videos dynamically via API
 */
export async function searchYouTubeVideos(query: string): Promise<YouTubeVideo[]> {
  const clean = query.trim();
  if (!clean) return [];

  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.videos) && data.videos.length > 0) {
        return data.videos;
      }
    }
  } catch (err) {
    console.warn('Live search error:', err);
  }

  return [];
}

/**
 * Live search autocomplete suggestions via Google/YouTube API
 */
export async function fetchSearchSuggestions(query: string): Promise<string[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  try {
    const res = await fetch(`/api/youtube/suggest?q=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        return data.suggestions.slice(0, 6);
      }
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Real dynamic category query pages for infinite scroll & random discovery
 */
export const CATEGORY_PAGES: Record<string, string[]> = {
  all: [
    'trending music official video',
    'popular viral hits songs',
    'trending podcasts highlights',
    'top khmer hits music',
    'top hits music spotify 2026',
    'entertaining trending comedy clips',
    'viral pop songs cover',
    'lofi beats chill relax',
    'live music acoustic concert',
  ],
  'khmer-music': [
    'Khmer songs official MV popular',
    'Khmer original song acoustic MV',
    'Khmer remix music hits trending',
    'Khmer love song romantic music',
    'Khmer acoustic guitar session song',
    'Baramey production VannDa song',
    'Galaxy Navatra official song',
    'Town Production Khmer song',
  ],
  lofi: [
    'lofi hip hop radio beats to relax study',
    'chill lofi beats to sleep study',
    'aesthetic lofi instrumental mix',
    'cozy lofi rain beats study work',
    'japanese lofi chill beats mix',
    'cafe lofi ambient music beats',
  ],
  tech: [
    'technology ai programming podcast',
    'software engineering latest gadgets tech review',
    'artificial intelligence latest news updates',
    'web development react nextjs coding tutorial',
    'apple event review tech review mkbhd',
    'future of robotics ai tech showcase',
  ],
};

export async function fetchCategoryVideosPage(
  category: string,
  pageIndex: number = 0
): Promise<YouTubeVideo[]> {
  const pages = CATEGORY_PAGES[category] || CATEGORY_PAGES['all'];
  const query = pages[pageIndex % pages.length];
  return searchYouTubeVideos(query);
}

export async function fetchDynamicCategoryVideos(
  category: string,
  isShuffle: boolean = false
): Promise<YouTubeVideo[]> {
  const pages = CATEGORY_PAGES[category] || CATEGORY_PAGES['all'];
  const query = isShuffle || category === 'all'
    ? pages[Math.floor(Math.random() * pages.length)]
    : pages[0];
  return searchYouTubeVideos(query);
}
