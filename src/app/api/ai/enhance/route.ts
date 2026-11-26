import { NextResponse } from 'next/server';

export interface RecentMessage {
  sender: 'me' | 'them';
  name?: string;
  text: string;
}

export interface EnhanceRequestBody {
  text?: string;
  tone: 'standard' | 'pro-work' | 'flirt' | 'short' | 'directly' | 'pitchy';
  recentMessages?: RecentMessage[];
}

const TONE_DESCRIPTIONS: Record<string, string> = {
  standard: 'Natural, polite, and brief (1 short sentence, max 10-14 words).',
  'pro-work': 'Professional, courteous, and concise (1 short sentence).',
  flirt: 'Playful, charming, witty 1-liner (1 short sentence, max 8-12 words).',
  short: 'Ultra-concise, punchy (under 6 words).',
  directly: 'Direct, clear, to the point with zero fluff (1 short sentence).',
  pitchy: 'Persuasive, energetic 1-liner (1 short sentence).',
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in .env.local' },
        { status: 500 }
      );
    }

    const body: EnhanceRequestBody = await req.json();
    const { text = '', tone = 'standard', recentMessages = [] } = body;

    const toneGuide = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.standard;

    // Take the last 10 messages for context
    const contextSlice = recentMessages.slice(-10);
    const contextFormatted = contextSlice.length > 0
      ? contextSlice
          .map((m) => `${m.sender === 'me' ? 'Me' : m.name || 'Them'}: ${m.text}`)
          .join('\n')
      : 'No prior messages in this conversation.';

    const systemInstruction = `
You are an expert AI communication and messaging enhancer inside a Telegram messaging app.
Your job is to rewrite or craft the best response for the user based on the specified tone, while fully understanding the conversational context from the last 10 messages.

Rules:
1. Keep it SHORT & PUNCHY: Telegram chat messages must be brief 1-liners (usually 1 short sentence, around 5 to 14 words). Never write long paragraphs, multiple sentences, or long-winded essays.
2. Return ONLY the final enhanced message text. Do NOT include markdown codeblocks, quotation marks around the entire message, introductory phrases like "Here is your message:", or explanations.
3. Context Awareness: Pay close attention to the last 10 messages (who said what, questions asked, current topics).
4. If the user provided a draft text, enhance and adapt that draft to the requested tone while keeping it concise.
5. If the user provided an empty or brief draft, generate a contextually relevant, natural, short 1-line reply.
6. Match the language used in the chat context (e.g., if the conversation is in Khmer, respond in natural Khmer; if in English, respond in English; if bilingual/mixed, maintain appropriate conversational code-switching).
7. Do NOT use emojis in the enhanced message unless the user's draft specifically contained them. Keep the text clean, natural, and realistic.
8. Never break character or output anything other than the message itself.
`;

    const userPrompt = `
Conversation Context (Last 10 messages):
${contextFormatted}

${text.trim() ? `User's Draft Message:\n"${text.trim()}"` : 'The user has not typed a draft yet and wants a contextually smart reply to the conversation above.'}

Requested Tone: ${tone.toUpperCase()}
Tone Guidelines: ${toneGuide}

Enhanced Message:
`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction}\n\n${userPrompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: tone === 'flirt' || tone === 'pitchy' ? 0.85 : 0.65,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[Gemini API Error]', geminiRes.status, errText);
      return NextResponse.json(
        { error: `Gemini API error: ${geminiRes.statusText}` },
        { status: geminiRes.status }
      );
    }

    const data = await geminiRes.json();
    let enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Strip leading/trailing outer quotes if Gemini wrapped it
    if ((enhanced.startsWith('"') && enhanced.endsWith('"')) || (enhanced.startsWith("'") && enhanced.endsWith("'"))) {
      enhanced = enhanced.slice(1, -1).trim();
    }

    return NextResponse.json({ enhanced, tone });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Enhance Route Error]', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
