/**
 * Cloudflare Workers AI service
 * Text generation: @cf/meta/llama-3.3-70b-instruct-fp8-fast
 * Image generation: @cf/black-forest-labs/flux-1-schnell
 */

export function getCloudflareCreds(): { accountId: string; apiToken: string } {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('tg-ui') : null;
    if (raw) {
      const { state } = JSON.parse(raw) as {
        state?: { cfAccountId?: string; cfApiToken?: string };
      };
      if (state?.cfAccountId && state?.cfApiToken) {
        return { accountId: state.cfAccountId.trim(), apiToken: state.cfApiToken.trim() };
      }
    }
  } catch {}

  const envAccount =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || ''
      : '';
  const envToken =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || ''
      : '';

  return {
    accountId: envAccount.trim(),
    apiToken: envToken.trim(),
  };
}

async function callCloudflare(model: string, payload: any): Promise<any> {
  const creds = getCloudflareCreds();

  // Try our local backend proxy first (avoids browser CORS)
  try {
    const res = await fetch('/api/cf/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        payload,
        accountId: creds.accountId,
        apiToken: creds.apiToken,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.errors && data.errors.length > 0) {
        throw new Error(data.errors[0]?.message || 'Cloudflare error');
      }
      return data;
    }
  } catch (err: any) {
    console.warn('[Cloudflare Proxy Error]', err?.message);
  }

  // Fallback: direct call (works in node/server environments)
  const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/run/${model}`;
  const res = await fetch(cfUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudflare AI error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  if (!data.success && data.errors?.[0]?.message) {
    throw new Error(data.errors[0].message);
  }
  return data;
}

/** Generate text with Llama 3.3 via Cloudflare Workers AI */
export async function cfGenText(prompt: string, systemPrompt?: string): Promise<string> {
  const model = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
  const messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: prompt },
  ];

  const data = await callCloudflare(model, {
    messages,
    max_tokens: 1024,
    temperature: 0.85,
  });

  const result = data.result;
  if (!result) return '';

  // Handle OpenAI-compatible choices structure
  if (Array.isArray(result.choices) && result.choices[0]?.message?.content) {
    return result.choices[0].message.content.trim();
  }

  // Handle response or text property
  if (typeof result.response === 'string') return result.response.trim();
  if (typeof result.text === 'string') return result.text.trim();

  return String(result || '').trim();
}

/** Generate an image with Flux Schnell via Cloudflare Workers AI — returns base64 data URL */
export async function cfGenImage(prompt: string): Promise<string> {
  const model = '@cf/black-forest-labs/flux-1-schnell';
  const data = await callCloudflare(model, { prompt });

  if (data?.result?.image) {
    const rawImage = data.result.image;
    if (rawImage.startsWith('data:image/')) {
      return rawImage;
    }
    return `data:image/jpeg;base64,${rawImage}`;
  }

  throw new Error('Image generation failed or returned empty image data');
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
  const system = `You are an elite creative AI character designer.
Output ONLY a raw valid JSON object without any explanations, without markdown code fences, matching this schema:
{
  "name": "Character Name",
  "tagline": "Short catchy 3-6 word tagline",
  "description": "2 sentence character summary",
  "voice": "Aoede",
  "prompt": "Detailed system prompt (100-150 words) starting with 'You are...'. Specify language, conversational tone, personality, and keeping answers short for live calls.",
  "greeting": "Warm 1-2 sentence spoken opening line when a call connects",
  "avatarEmoji": "🤖",
  "imagePrompt": "Vivid portrait photo prompt describing hair, face, outfit, lighting, style for a high-res digital avatar"
}
Rules:
- voice must be exactly one of: "Aoede", "Kore", "Puck", "Charon", "Fenrir"
- avatarEmoji must be a single emoji representing the character
- Return raw JSON only!`;

  const userMsg = `Design an AI character based on this concept: "${concept}"`;
  const raw = await cfGenText(userMsg, system);

  // Clean markdown fences if any
  let cleanJson = raw.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON. Please try again.');
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    name?: string;
    tagline?: string;
    description?: string;
    voice?: string;
    prompt?: string;
    greeting?: string;
    avatarEmoji?: string;
    imagePrompt?: string;
  };

  const validVoices = ['Aoede', 'Kore', 'Puck', 'Charon', 'Fenrir'] as const;
  const matchedVoice = validVoices.find(
    (v) => v.toLowerCase() === (parsed.voice || '').toLowerCase().trim()
  );

  return {
    name: parsed.name || 'AI Character',
    tagline: parsed.tagline || '',
    description: parsed.description || '',
    voice: matchedVoice || 'Aoede',
    prompt: parsed.prompt || `You are ${parsed.name || 'AI Companion'}, a friendly conversational companion.`,
    greeting: parsed.greeting || `Hello! I am ${parsed.name || 'ready to talk'}. How are you today?`,
    avatarEmoji: parsed.avatarEmoji || '🤖',
    imagePrompt: parsed.imagePrompt || `portrait avatar of ${parsed.name || 'an AI character'}, digital art, clean background, sharp focus`,
  };
}
