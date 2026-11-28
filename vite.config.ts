import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { Plugin, ViteDevServer } from 'vite';

function apiDevMiddleware(env: Record<string, string>): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

        if (url.pathname === '/api/youtube/suggest' && req.method === 'GET') {
          const q = url.searchParams.get('q') || '';
          if (!q.trim()) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ suggestions: [] }));
            return;
          }
          try {
            const ytRes = await fetch(
              `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&client=firefox&q=${encodeURIComponent(q)}`,
              {
                headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
              }
            );
            const data = await ytRes.json();
            const suggestions = Array.isArray(data?.[1]) ? data[1] : [];
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ suggestions }));
          } catch (err: any) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ suggestions: [] }));
          }
          return;
        }

        if (url.pathname === '/api/youtube/channel' && req.method === 'GET') {
          const id = url.searchParams.get('id') || '';
          const q = url.searchParams.get('q') || '';
          if (!id.trim() && !q.trim()) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ channel: null }));
            return;
          }
          try {
            let channelId = id.trim();
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

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    channel: {
                      id: channelId,
                      name,
                      avatar,
                      cover: banner,
                      subscribers,
                    },
                  })
                );
                return;
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ channel: searchChannelInfo || null }));
          } catch (err: any) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ channel: null }));
          }
          return;
        }

        if (url.pathname === '/api/youtube/search' && req.method === 'GET') {
          const q = url.searchParams.get('q') || '';
          if (!q.trim()) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ videos: [], channel: null }));
            return;
          }
          try {
            const ytRes = await fetch(
              `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
              {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept-Language': 'en-US,en;q=0.9,km;q=0.8',
                },
              }
            );
            const html = await ytRes.text();
            const match =
              html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
              html.match(/ytInitialData\s*=\s*({.+?});/);

            if (!match) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ videos: [], channel: null }));
              return;
            }

            const data = JSON.parse(match[1]);
            const sections =
              data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

            const videos: any[] = [];
            let channelInfo: any = null;

            for (const section of sections) {
              const items = section?.itemSectionRenderer?.contents || [];
              for (const item of items) {
                if (!channelInfo && item?.channelRenderer) {
                  const cr = item.channelRenderer;
                  const cThumbs = cr.thumbnail?.thumbnails;
                  const rawCAvatar = cThumbs?.[cThumbs.length - 1]?.url || cThumbs?.[0]?.url || '';
                  const cAvatar = (rawCAvatar.startsWith('//') ? `https:${rawCAvatar}` : rawCAvatar).replace(/=s\d+-/, '=s176-');
                  channelInfo = {
                    id: cr.channelId || '',
                    name: cr.title?.simpleText || '',
                    avatar: cAvatar,
                    subscribers: cr.subscriberCountText?.simpleText || cr.videoCountText?.simpleText || '',
                  };
                }

                const v = item?.videoRenderer;
                if (v && v.videoId) {
                  const channelThumbs =
                    v?.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails;
                  const nav = v?.ownerText?.runs?.[0]?.navigationEndpoint;
                  const rawAvatar =
                    channelThumbs?.[channelThumbs.length - 1]?.url ||
                    channelThumbs?.[0]?.url ||
                    '';
                  const fullAvatar = rawAvatar.startsWith('//') ? `https:${rawAvatar}` : rawAvatar;
                  const channelAvatar = fullAvatar ? fullAvatar.replace(/=s\d+-/, '=s176-') : '';

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

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ videos: videos.slice(0, 24), channel: channelInfo }));
          } catch (err: any) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ videos: [], channel: null }));
          }
          return;
        }

        if (url.pathname === '/api/ai/enhance' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const apiKey = env.GEMINI_API_KEY || env.NEXT_PUBLIC_GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'GEMINI_API_KEY not found in .env.local' }));
                return;
              }

              const body = JSON.parse(bodyStr || '{}');
              const { text = '', tone = 'standard', recentMessages = [] } = body;

              const TONE_DESCRIPTIONS: Record<string, string> = {
                standard: 'Natural, polite, and brief (1 short sentence, max 10-14 words).',
                'pro-work': 'Professional, courteous, and concise (1 short sentence).',
                flirt: 'Playful, charming, witty 1-liner (1 short sentence, max 8-12 words).',
                short: 'Ultra-concise, punchy (under 6 words).',
                directly: 'Direct, clear, to the point with zero fluff (1 short sentence).',
                pitchy: 'Persuasive, energetic 1-liner (1 short sentence).',
              };

              const toneGuide = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.standard;
              const contextSlice = (recentMessages || []).slice(-10);
              const contextFormatted = contextSlice.length > 0
                ? contextSlice.map((m: any) => `${m.sender === 'me' ? 'Me' : m.name || 'Them'}: ${m.text}`).join('\n')
                : 'No prior messages in this conversation.';

              const systemInstruction = `
You are an expert AI communication and messaging enhancer inside a Telegram messaging app.
Your job is to rewrite or craft the best response for the user based on the specified tone, while fully understanding the conversational context from the last 10 messages.

Rules:
1. Keep it SHORT & PUNCHY: Telegram chat messages must be brief 1-liners (usually 1 short sentence, around 5 to 14 words).
2. Return ONLY the final enhanced message text without quotes or markdown.
3. Match the language used in the chat context (e.g. Khmer if in Khmer, English if in English).
`;

              const userPrompt = `
Conversation Context (Last 10 messages):
${contextFormatted}

${text.trim() ? `User's Draft Message:\n"${text.trim()}"` : 'Generate a short 1-line reply to the conversation above.'}

Requested Tone: ${tone.toUpperCase()}
Tone Guidelines: ${toneGuide}

Enhanced Message:
`;

              const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
              const geminiRes = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
                  generationConfig: {
                    temperature: tone === 'flirt' || tone === 'pitchy' ? 0.85 : 0.65,
                    maxOutputTokens: 600,
                  },
                }),
              });

              if (!geminiRes.ok) {
                const errText = await geminiRes.text();
                res.statusCode = geminiRes.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: errText }));
                return;
              }

              const data: any = await geminiRes.json();
              let enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
              if ((enhanced.startsWith('"') && enhanced.endsWith('"')) || (enhanced.startsWith("'") && enhanced.endsWith("'"))) {
                enhanced = enhanced.slice(1, -1).trim();
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ enhanced, tone }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
            }
          });
          return;
        }

        if (url.pathname === '/api/cf/run' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const accountId = body.accountId || env.CLOUDFLARE_ACCOUNT_ID || env.NEXT_PUBLIC_CF_ACCOUNT_ID || '';
              const apiToken = body.apiToken || env.CLOUDFLARE_API_TOKEN || env.NEXT_PUBLIC_CF_API_TOKEN || '';
              const model = body.model;
              const payload = body.payload || {};

              if (!model) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing model parameter' }));
                return;
              }

              const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
              const cfRes = await fetch(cfUrl, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${apiToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
              });

              const contentType = cfRes.headers.get('content-type') || 'application/json';
              if (contentType.includes('application/json')) {
                const data = await cfRes.json();
                res.statusCode = cfRes.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              } else {
                const buffer = await cfRes.arrayBuffer();
                res.statusCode = cfRes.status;
                res.setHeader('Content-Type', contentType);
                res.end(Buffer.from(buffer));
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Cloudflare proxy error' }));
            }
          });
          return;
        }

        if (url.pathname === '/api/stories') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ stories: [] }));
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      apiDevMiddleware(env),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
        'next/navigation': path.resolve(import.meta.dirname, './src/lib/router-compat.tsx'),
        'next/link': path.resolve(import.meta.dirname, './src/lib/router-compat.tsx'),
      },
    },
    define: {
      'process.env.NEXT_PUBLIC_API_ID': JSON.stringify(env.NEXT_PUBLIC_API_ID || '26713734'),
      'process.env.NEXT_PUBLIC_API_HASH': JSON.stringify(env.NEXT_PUBLIC_API_HASH || 'ce41f5915389862a172974121887c711'),
      'process.env.NEXT_PUBLIC_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.NEXT_PUBLIC_GEMINI_API_KEY || ''),
      'process.env.NEXT_PUBLIC_CARTO_API_KEY': JSON.stringify(env.NEXT_PUBLIC_CARTO_API_KEY || ''),
      'process.env.NEXT_PUBLIC_CF_ACCOUNT_ID': JSON.stringify(env.CLOUDFLARE_ACCOUNT_ID || env.NEXT_PUBLIC_CF_ACCOUNT_ID || ''),
      'process.env.NEXT_PUBLIC_CF_API_TOKEN': JSON.stringify(env.CLOUDFLARE_API_TOKEN || env.NEXT_PUBLIC_CF_API_TOKEN || ''),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    server: {
      host: true,
      port: 3000,
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/@mtproto/core')) {
              return 'vendor-mtproto';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
          },
        },
      },
    },
  };
});
