/**
 * Cloudflare Workers AI service
 * Text generation: @cf/meta/llama-3.3-70b-instruct-fp8-fast
 * Image generation: @cf/black-forest-labs/flux-1-schnell
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';

function getCreds(): { accountId: string; apiToken: string } | null {
  try {
    const raw = localStorage.getItem('tg-ui');
    if (!raw) return null;
    const { state } = JSON.parse(raw) as {
      state?: { cfAccountId?: string; cfApiToken?: string };
    };
    if (state?.cfAccountId && state?.cfApiToken) {
      return { accountId: state.cfAccountId, apiToken: state.cfApiToken };
    }
  } catch {}
  // Env fallback (for dev)
  const accountId =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_CF_ACCOUNT_ID ?? '' : '';
  const apiToken =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_CF_API_TOKEN ?? '' : '';
  return accountId && apiToken ? { accountId, apiToken } : null;
}

/** Generate text with Llama via Cloudflare Workers AI */
export async function cfGenText(prompt: string, systemPrompt?: string): Promise<string> {
  const creds = getCreds();
  if (!creds) throw new Error('Cloudflare credentials not configured. Go to Settings → Profile → Cloudflare AI.');

  const model = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
  const url = `${CF_API_BASE}/${creds.accountId}/ai/run/${model}`;

  const messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: prompt },
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, max_tokens: 1024, temperature: 0.85 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudflare AI error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    success: boolean;
    result?: { response?: string } | { text?: string };
    errors?: Array<{ message: string }>;
  };

  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Cloudflare AI failed');
  }

  const result = data.result as Record<string, unknown>;
  return String(result?.response ?? result?.text ?? '');
}

/** Generate an image with Flux via Cloudflare Workers AI — returns a base64 PNG data URL */
export async function cfGenImage(prompt: string): Promise<string> {
  const creds = getCreds();
  if (!creds) throw new Error('Cloudflare credentials not configured.');

  const model = '@cf/black-forest-labs/flux-1-schnell';
  const url = `${CF_API_BASE}/${creds.accountId}/ai/run/${model}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, num_steps: 4 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudflare Image AI error ${res.status}: ${err}`);
  }

  // Flux returns raw binary image bytes
  const contentType = res.headers.get('content-type') || 'image/png';
  if (contentType.includes('application/json')) {
    // Some models return base64 in JSON
    const data = await res.json() as { result?: { image?: string } };
    const b64 = data.result?.image ?? '';
    return `data:image/png;base64,${b64}`;
  }

  // Raw binary → base64
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return `data:image/png;base64,${b64}`;
}

/** Auto-generate a full persona JSON from just a concept/idea string */
export async function cfAutoGenPersona(concept: string): Promise<{
  name: string;
  tagline: string;
  description: string;
  voice: 'Aoede' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';
  prompt: string;
  greeting: string;
  avatarEmoji: string;
  imagePrompt: string;
}> {
  const system = `You are a creative AI character designer. Output ONLY valid JSON with these exact keys:
name, tagline, description, voice, prompt, greeting, avatarEmoji, imagePrompt.
voice must be one of: Aoede, Kore, Puck, Charon, Fenrir.
avatarEmoji must be a single emoji.
prompt should be a detailed character system prompt (100-200 words) written in second-person ("You are...").
greeting should be a warm 1-2 sentence opening line the AI says when a call connects.
imagePrompt should be a vivid image generation prompt for a portrait avatar of this character (describe appearance, style, art style).
Output only the JSON object, no markdown, no extra text.`;

  const userMsg = `Design an AI voice call character based on this concept: "${concept}"`;
  const raw = await cfGenText(userMsg, system);

  // Extract JSON from the response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return valid JSON');

  const parsed = JSON.parse(jsonMatch[0]) as {
    name?: string; tagline?: string; description?: string;
    voice?: string; prompt?: string; greeting?: string;
    avatarEmoji?: string; imagePrompt?: string;
  };

  const validVoices = ['Aoede', 'Kore', 'Puck', 'Charon', 'Fenrir'] as const;
  const voice = validVoices.includes(parsed.voice as typeof validVoices[number])
    ? (parsed.voice as typeof validVoices[number])
    : 'Aoede';

  return {
    name: parsed.name || 'AI Character',
    tagline: parsed.tagline || '',
    description: parsed.description || '',
    voice,
    prompt: parsed.prompt || '',
    greeting: parsed.greeting || 'Hello! I am ready to chat.',
    avatarEmoji: parsed.avatarEmoji || '🤖',
    imagePrompt: parsed.imagePrompt || `portrait of ${parsed.name || 'AI character'}, digital art`,
  };
}
