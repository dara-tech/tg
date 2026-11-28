export default async function handler(req: any, res: any) {
  const urlObj = new URL(req.url, 'http://localhost');
  const id = req.query?.id || urlObj.searchParams.get('id') || '';
  const q = req.query?.q || urlObj.searchParams.get('q') || '';

  if (!id.trim() && !q.trim()) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ channel: null });
  }

  try {
    let channelId = id.trim();

    // If channelId is not direct UC... ID, search by name to resolve channelId and fallback info
    let searchChannelInfo: any = null;
    if (!channelId.startsWith('UC')) {
      const searchRes = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(channelId || q)}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        }
      );
      const searchHtml = await searchRes.text();
      const sMatch =
        searchHtml.match(/var ytInitialData = ({.*?});<\/script>/s) ||
        searchHtml.match(/ytInitialData\s*=\s*({.+?});/);

      if (sMatch) {
        const sData = JSON.parse(sMatch[1]);
        const sections =
          sData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        for (const sec of sections) {
          for (const it of sec?.itemSectionRenderer?.contents || []) {
            if (it?.channelRenderer) {
              const cr = it.channelRenderer;
              channelId = cr.channelId || channelId;
              const cThumbs = cr.thumbnail?.thumbnails;
              const rawCAvatar = cThumbs?.[cThumbs.length - 1]?.url || cThumbs?.[0]?.url || '';
              const cAvatar = (rawCAvatar.startsWith('//') ? `https:${rawCAvatar}` : rawCAvatar).replace(/=s\d+-/, '=s176-');
              searchChannelInfo = {
                id: cr.channelId,
                name: cr.title?.simpleText || q,
                avatar: cAvatar,
                subscribers: cr.subscriberCountText?.simpleText || '',
              };
              break;
            }
          }
          if (channelId.startsWith('UC')) break;
        }
      }
    }

    // Now if we have a channelId, fetch channel page for banner and profile
    if (channelId.startsWith('UC')) {
      const chanRes = await fetch(`https://www.youtube.com/channel/${channelId}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9,km;q=0.8',
        },
      });

      const chanHtml = await chanRes.text();
      const cMatch =
        chanHtml.match(/var ytInitialData = ({.*?});<\/script>/s) ||
        chanHtml.match(/ytInitialData\s*=\s*({.+?});/);

      if (cMatch) {
        const cData = JSON.parse(cMatch[1]);
        const ph = cData?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
        const banner = ph?.banner?.imageBannerViewModel?.image?.sources?.slice(-1)[0]?.url || undefined;
        const avatarSources = ph?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources;
        const rawAvatar = avatarSources?.slice(-1)[0]?.url || searchChannelInfo?.avatar;
        const avatar = rawAvatar ? (rawAvatar.startsWith('//') ? `https:${rawAvatar}` : rawAvatar) : undefined;
        const name = ph?.title?.dynamicTextViewModel?.text?.content || searchChannelInfo?.name || q;
        const metadata = ph?.metadata?.contentMetadataViewModel?.metadataRows;
        const subscribers = metadata?.[0]?.metadataParts?.[0]?.text?.content || searchChannelInfo?.subscribers || undefined;

        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
          channel: {
            id: channelId,
            name,
            avatar,
            cover: banner,
            subscribers,
          },
        });
      }
    }

    // Return search channel info if direct channel page could not be fetched
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      channel: searchChannelInfo || null,
    });
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ channel: null });
  }
}
