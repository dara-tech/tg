import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  if (!q.trim()) {
    return NextResponse.json({ videos: [] });
  }

  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9,km;q=0.8',
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ videos: [] });
    }

    const html = await res.text();
    const match =
      html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
      html.match(/ytInitialData\s*=\s*({.+?});/);

    if (!match) {
      return NextResponse.json({ videos: [] });
    }

    const data = JSON.parse(match[1]);
    const sections =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    const videos: Array<{
      id: string;
      title: string;
      channel: string;
      channelAvatar?: string;
      channelId?: string;
      channelUrl?: string;
      duration: string;
      views: string;
      thumbnail: string;
    }> = [];

    for (const section of sections) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item?.videoRenderer;
        if (v && v.videoId) {
          const channelThumbs =
            v?.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails;
          const nav = v?.ownerText?.runs?.[0]?.navigationEndpoint;
          const rawAvatar =
            channelThumbs?.[channelThumbs.length - 1]?.url ||
            channelThumbs?.[0]?.url ||
            '';
          const channelAvatar = rawAvatar.startsWith('//') ? `https:${rawAvatar}` : rawAvatar;

          videos.push({
            id: v.videoId,
            title: v.title?.runs?.[0]?.text || '',
            channel: v.ownerText?.runs?.[0]?.text || '',
            channelAvatar,
            channelId: nav?.browseEndpoint?.browseId || '',
            channelUrl: nav?.commandMetadata?.webCommandMetadata?.url || '',
            duration: v.lengthText?.simpleText || '',
            views: v.viewCountText?.simpleText || '',
            thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          });
        }
      }
    }

    return NextResponse.json({ videos: videos.slice(0, 24) });
  } catch (error) {
    return NextResponse.json({ videos: [] });
  }
}
