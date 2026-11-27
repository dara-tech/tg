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
