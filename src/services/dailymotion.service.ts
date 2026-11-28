export interface DailymotionVideo {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  views: string;
  category?: string;
}

export type DailymotionCategory = 'all' | 'news' | 'music' | 'tv' | 'cinema' | 'gaming' | 'sport' | 'favorites';

export const DAILYMOTION_CATEGORIES: { id: DailymotionCategory; label: string; icon?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'cinema', label: 'Movies & Drama' },
  { id: 'tv', label: 'TV Shows' },
  { id: 'music', label: 'Music' },
  { id: 'news', label: 'News' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'sport', label: 'Sport' },
  { id: 'favorites', label: 'Saved' },
];

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return 'Video';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}:${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViews(views: number): string {
  if (!views) return 'Featured';
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} views`;
}

const FALLBACK_VIDEOS: DailymotionVideo[] = [
  {
    id: 'xc0tcky',
    title: 'A Rainha Loba da Lua Nunca Perdoa Full Movie English',
    channel: 'Dragonfly Junction Films',
    thumbnail: 'https://s2.dmcdn.net/v/hL9Jo1h2mbXjMOOY9/x360',
    duration: '1:15:29',
    views: '125K views',
    category: 'cinema',
  },
  {
    id: 'xc0te86',
    title: 'The Groom He Sent Instead - Complete Drama',
    channel: 'Fawn Cloister Tales',
    thumbnail: 'https://s1.dmcdn.net/v/hL9r61h2maxA9-FPY/x360',
    duration: '36:39',
    views: '84K views',
    category: 'cinema',
  },
  {
    id: 'xc0tdai',
    title: 'Shukk Ep (Full Episodes) - Short Drama',
    channel: 'Kite Arcade Stories',
    thumbnail: 'https://s1.dmcdn.net/v/hL9YA1h2mbigkAY0l/x360',
    duration: '39:55',
    views: '45K views',
    category: 'tv',
  },
  {
    id: 'xc0tcp2',
    title: 'Fated to Find You Again | Short Drama Full HD 720p',
    channel: 'KryssSDReelDramaThorne',
    thumbnail: 'https://s2.dmcdn.net/v/hL9M61h2mbDyMh25C/x360',
    duration: '1:33:02',
    views: '230K views',
    category: 'tv',
  },
  {
    id: 'x32rz5h',
    title: 'Khmer News Khmer Song & Entertainment Update',
    channel: 'Khmer Daily',
    thumbnail: 'https://s1.dmcdn.net/v/B5nYr1gsWtcmmuBX9/x360',
    duration: '4:25',
    views: '12K views',
    category: 'news',
  },
];

export async function fetchDailymotionVideos(
  category: DailymotionCategory = 'all',
  page: number = 1
): Promise<DailymotionVideo[]> {
  try {
    let url = `https://api.dailymotion.com/videos?fields=id,title,thumbnail_360_url,duration,owner.screenname,views_total,channel&limit=24&page=${page}`;
    
    if (category === 'cinema') {
      url += '&channel=shortfilms';
    } else if (category === 'tv') {
      url += '&channel=tv';
    } else if (category === 'music') {
      url += '&channel=music';
    } else if (category === 'news') {
      url += '&channel=news';
    } else if (category === 'gaming') {
      url += '&channel=videogames';
    } else if (category === 'sport') {
      url += '&channel=sport';
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    if (data && Array.isArray(data.list) && data.list.length > 0) {
      return data.list.map((item: any) => ({
        id: item.id,
        title: item.title || 'Dailymotion Video',
        channel: item['owner.screenname'] || 'Dailymotion Creator',
        thumbnail: item.thumbnail_360_url || `https://www.dailymotion.com/thumbnail/video/${item.id}`,
        duration: formatDuration(item.duration),
        views: formatViews(item.views_total),
        category: item.channel || category,
      }));
    }
  } catch (e) {
    console.warn('Dailymotion fetch error, returning fallback data:', e);
  }
  return FALLBACK_VIDEOS;
}

export async function searchDailymotionVideos(
  query: string,
  page: number = 1
): Promise<DailymotionVideo[]> {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const url = `https://api.dailymotion.com/videos?search=${encodeURIComponent(
      cleanQuery
    )}&fields=id,title,thumbnail_360_url,duration,owner.screenname,views_total,channel&limit=24&page=${page}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data && Array.isArray(data.list)) {
      return data.list.map((item: any) => ({
        id: item.id,
        title: item.title || 'Dailymotion Video',
        channel: item['owner.screenname'] || 'Dailymotion Creator',
        thumbnail: item.thumbnail_360_url || `https://www.dailymotion.com/thumbnail/video/${item.id}`,
        duration: formatDuration(item.duration),
        views: formatViews(item.views_total),
        category: item.channel || 'search',
      }));
    }
  } catch (e) {
    console.warn('Dailymotion search error:', e);
  }
  return [];
}
