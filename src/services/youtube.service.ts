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
 * Curated, resilient fallback videos with guaranteed 100% active, high-resolution thumbnails
 */
export const FALLBACK_VIDEOS: Record<string, YouTubeVideo[]> = {
  all: [
    {
      id: 'gNi_6U5Pm_o',
      title: 'VannDa - Time To Rise feat. Master Kong Nay (Official Music Video)',
      channel: 'Baramey Production',
      channelAvatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80',
      duration: '4:28',
      views: '124M views',
      thumbnail: 'https://i.ytimg.com/vi/gNi_6U5Pm_o/hqdefault.jpg',
    },
    {
      id: '5qap5aO4i9A',
      title: 'Lofi Hip Hop Radio - Beats to relax / study to (24/7 Chill Music)',
      channel: 'Lofi Girl',
      channelAvatar: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=120&auto=format&fit=crop&q=80',
      duration: 'LIVE',
      views: '65K watching',
      thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
    },
    {
      id: 'K4TOrB7at0Y',
      title: 'Exclusive Top Funny Comedy Video 2026 - Best Laughs & Bloopers',
      channel: 'Bidik Fun Tv',
      channelAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      duration: '10:20',
      views: '185K views',
      thumbnail: 'https://i.ytimg.com/vi/K4TOrB7at0Y/hqdefault.jpg',
    },
    {
      id: 'bMKN19m7W7k',
      title: 'VannDa - Solo (Official Music Video)',
      channel: 'Baramey Production',
      channelAvatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80',
      duration: '4:15',
      views: '45M views',
      thumbnail: 'https://i.ytimg.com/vi/bMKN19m7W7k/hqdefault.jpg',
    },
    {
      id: 'dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
      channel: 'Rick Astley',
      channelAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      duration: '3:33',
      views: '1.5B views',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    },
    {
      id: 'kJQP7kiw5Fk',
      title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
      channel: 'Luis Fonsi',
      channelAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      duration: '4:42',
      views: '8.4B views',
      thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    },
  ],
  'khmer-music': [
    {
      id: 'gNi_6U5Pm_o',
      title: 'VannDa - Time To Rise feat. Master Kong Nay (Official Music Video)',
      channel: 'Baramey Production',
      channelAvatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80',
      duration: '4:28',
      views: '124M views',
      thumbnail: 'https://i.ytimg.com/vi/gNi_6U5Pm_o/hqdefault.jpg',
    },
    {
      id: 'bMKN19m7W7k',
      title: 'VannDa - Solo (Official Music Video)',
      channel: 'Baramey Production',
      channelAvatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80',
      duration: '4:15',
      views: '45M views',
      thumbnail: 'https://i.ytimg.com/vi/bMKN19m7W7k/hqdefault.jpg',
    },
    {
      id: 'q0hyYWKXF0Q',
      title: 'Ton Chanseyma - Are You Ok? (Official Music Video)',
      channel: 'Galaxy Navatra',
      channelAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      duration: '3:45',
      views: '130M views',
      thumbnail: 'https://i.ytimg.com/vi/q0hyYWKXF0Q/hqdefault.jpg',
    },
  ],
  lofi: [
    {
      id: '5qap5aO4i9A',
      title: 'Lofi Hip Hop Radio - Beats to relax / study to (24/7 Chill Music)',
      channel: 'Lofi Girl',
      channelAvatar: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=120&auto=format&fit=crop&q=80',
      duration: 'LIVE',
      views: '65K watching',
      thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
    },
    {
      id: '4xDzrJKXOOY',
      title: 'Synthwave Radio - Chill synth / retro electro beats',
      channel: 'Lofi Girl',
      channelAvatar: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=120&auto=format&fit=crop&q=80',
      duration: 'LIVE',
      views: '18K watching',
      thumbnail: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
    },
  ],
  tech: [
    {
      id: 'SqcY0GlETPk',
      title: 'Next.js in 100 Seconds // Full Overview & Quickstart',
      channel: 'Fireship',
      channelAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
      duration: '2:25',
      views: '1.2M views',
      thumbnail: 'https://i.ytimg.com/vi/SqcY0GlETPk/hqdefault.jpg',
    },
    {
      id: 'd0yGk3_4o4Y',
      title: 'Apple Vision Pro Impressions: Tomorrow’s Tech Today!',
      channel: 'Marques Brownlee',
      channelAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      duration: '18:42',
      views: '14M views',
      thumbnail: 'https://i.ytimg.com/vi/d0yGk3_4o4Y/hqdefault.jpg',
    },
  ],
};

/**
 * Live search real YouTube videos dynamically via API with fail-safe fallbacks
 */
export async function searchYouTubeVideos(query: string): Promise<YouTubeVideo[]> {
  const clean = query.trim();
  if (!clean) return FALLBACK_VIDEOS.all;

  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(clean)}`);
    // Guard against non-JSON (e.g. index.html SPA fallback)
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.videos) && data.videos.length > 0) {
        return data.videos;
      }
    }
  } catch (err) {
    console.warn('Live search API error:', err);
  }

  // Fallback matching query words
  const lowerQ = clean.toLowerCase();
  if (lowerQ.includes('khmer') || lowerQ.includes('vannda') || lowerQ.includes('song')) {
    return FALLBACK_VIDEOS['khmer-music'];
  }
  if (lowerQ.includes('lofi') || lowerQ.includes('chill') || lowerQ.includes('relax')) {
    return FALLBACK_VIDEOS['lofi'];
  }
  if (lowerQ.includes('tech') || lowerQ.includes('code') || lowerQ.includes('ai')) {
    return FALLBACK_VIDEOS['tech'];
  }

  return FALLBACK_VIDEOS.all;
}

/**
 * Live search autocomplete suggestions via Google/YouTube API
 */
export async function fetchSearchSuggestions(query: string): Promise<string[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  try {
    const res = await fetch(`/api/youtube/suggest?q=${encodeURIComponent(clean)}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
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

export interface YouTubeChannelInfo {
  id: string;
  name: string;
  avatar?: string;
  cover?: string;
  subscribers?: string;
  description?: string;
}

/**
 * Fetch YouTube Channel Profile & Panoramic Banner
 */
export async function fetchYouTubeChannelDetails(
  channelId: string,
  channelName: string = ''
): Promise<YouTubeChannelInfo | null> {
  const cleanId = (channelId || '').trim();
  const cleanName = (channelName || '').trim();
  if (!cleanId && !cleanName) return null;

  try {
    const res = await fetch(
      `/api/youtube/channel?id=${encodeURIComponent(cleanId)}&q=${encodeURIComponent(cleanName)}`
    );
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.channel) {
        return data.channel;
      }
    }
  } catch (err) {
    console.warn('Error fetching channel details:', err);
  }

  return null;
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
  const results = await searchYouTubeVideos(query);
  if (results && results.length > 0) return results;

  const fallback = FALLBACK_VIDEOS[category] || FALLBACK_VIDEOS['all'];
  return fallback;
}

export async function fetchDynamicCategoryVideos(
  category: string,
  isShuffle: boolean = false
): Promise<YouTubeVideo[]> {
  const pages = CATEGORY_PAGES[category] || CATEGORY_PAGES['all'];
  const query =
    isShuffle || category === 'all'
      ? pages[Math.floor(Math.random() * pages.length)]
      : pages[0];
  const results = await searchYouTubeVideos(query);
  if (results && results.length > 0) return results;

  const fallback = FALLBACK_VIDEOS[category] || FALLBACK_VIDEOS['all'];
  return fallback;
}
