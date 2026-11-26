import { Api, TelegramClient, Logger, sessions } from 'telegram';
import { LogLevel } from 'telegram/extensions/Logger';

const DC_HOSTS: Record<number, string> = {
  1: '149.154.175.53',
  2: '149.154.167.50',
  3: '149.154.175.100',
  4: '149.154.167.92',
  5: '91.108.56.128',
};

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
}

/** Encode (dcId, ip, port, authKeyBytes) into GramJS StringSession v1 format */
function buildGramJSStringSession(dcId: number, authKeyBytes: number[]): string {
  const ip = DC_HOSTS[dcId] || DC_HOSTS[4];
  const ipBuf = Buffer.from(ip, 'utf8');
  const lenBuf = Buffer.alloc(2);
  lenBuf.writeInt16BE(ipBuf.length, 0);
  const portBuf = Buffer.alloc(2);
  portBuf.writeInt16BE(443, 0);
  const dcBuf = Buffer.from([dcId & 0xff]);
  const keyBuf = Buffer.from(authKeyBytes);
  const payload = Buffer.concat([dcBuf, lenBuf, ipBuf, portBuf, keyBuf]);
  return '1' + payload.toString('base64');
}

const clientCache = new Map<string, TelegramClient>();

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} (${ms}ms)`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

async function getGramJSClient(dcId: number, authKeyBytes: number[]): Promise<TelegramClient> {
  const apiId = parseInt(process.env.NEXT_PUBLIC_API_ID ?? '0', 10);
  const apiHash = process.env.NEXT_PUBLIC_API_HASH ?? '';
  if (!apiId || !apiHash) {
    throw new Error('Missing NEXT_PUBLIC_API_ID or NEXT_PUBLIC_API_HASH');
  }

  const keyFingerprint = `${dcId}:${authKeyBytes.slice(0, 8).join(',')}`;
  const existing = clientCache.get(keyFingerprint);
  if (existing) {
    if (!existing.connected) {
      try {
        await withTimeout(existing.connect(), 5000, 'GramJS reconnect timeout');
      } catch (e) {
        clientCache.delete(keyFingerprint);
        existing.destroy().catch(() => {});
        throw e;
      }
    }
    return existing;
  }

  const sessionStr = buildGramJSStringSession(dcId, authKeyBytes);
  const stringSession = new sessions.StringSession(sessionStr);

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    useWSS: true,
    connectionRetries: 1,
    autoReconnect: false,
    timeout: 4,
    baseLogger: new Logger(LogLevel.NONE),
  });

  try {
    await withTimeout(client.connect(), 5000, 'GramJS connect timeout');
  } catch (e) {
    client.destroy().catch(() => {});
    throw e;
  }

  clientCache.set(keyFingerprint, client);
  return client;
}

async function runWithCandidates<T>(
  candidates: Array<{ dcId: number; authKey: number[] }>,
  fn: (client: TelegramClient, dcId: number) => Promise<T>
): Promise<{ result?: T; client?: TelegramClient; dcId?: number; error?: string }> {
  let lastErr = '';
  for (const cand of candidates) {
    const fingerprint = `${cand.dcId}:${cand.authKey.slice(0, 8).join(',')}`;
    try {
      const client = await getGramJSClient(cand.dcId, cand.authKey);
      const result = await withTimeout(fn(client, cand.dcId), 6000, `DC ${cand.dcId} RPC timeout`);
      return { result, client, dcId: cand.dcId };
    } catch (e: unknown) {
      lastErr = e instanceof Error ? e.message : String(e);
      const broken = clientCache.get(fingerprint);
      if (broken) {
        clientCache.delete(fingerprint);
        broken.destroy().catch(() => {});
      }
    }
  }
  return { error: lastErr || 'Could not connect to Telegram DC' };
}

export async function GET() {
  return Response.json({
    ok: true,
    endpoint: '/api/stories',
    usage: 'POST { action: "list" | "media" | "read", candidates: [...] }',
  });
}

function buildInputPeer(peerType: string, peerId: number | string, accessHash = '0') {
  const idBig = BigInt(String(peerId || 0));
  const hashBig = BigInt(String(accessHash || '0'));
  if (peerType === 'channel') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Api.InputPeerChannel({ channelId: idBig as any, accessHash: hashBig as any });
  }
  if (peerType === 'chat') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Api.InputPeerChat({ chatId: idBig as any });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Api.InputPeerUser({ userId: idBig as any, accessHash: hashBig as any });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: 'list' | 'media' | 'read';
      dcId?: number;
      authKey?: number[];
      candidates?: Array<{ dcId: number; authKey: number[] }>;
      peerType?: 'user' | 'chat' | 'channel';
      peerId?: number;
      accessHash?: string;
      storyId?: number;
    };

    const candidates =
      body.candidates && body.candidates.length > 0
        ? body.candidates
        : body.dcId && Array.isArray(body.authKey) && body.authKey.length >= 32
        ? [{ dcId: Number(body.dcId), authKey: body.authKey }]
        : [];

    if (candidates.length === 0) {
      return Response.json({ stories: [], error: 'Missing active MTProto session key' }, { status: 200 });
    }

    const action = body.action || 'list';

    if (action === 'read' && body.peerId && body.storyId) {
      const readRes = await runWithCandidates(candidates, (client) =>
        client.invoke(
          new Api.stories.ReadStories({
            peer: buildInputPeer(body.peerType || 'user', body.peerId!, body.accessHash || '0'),
            maxId: Number(body.storyId),
          })
        )
      );
      if (readRes.error) {
        return Response.json({ ok: false, error: readRes.error }, { status: 200 });
      }
      return Response.json({ ok: true });
    }

    if (action === 'media' && body.peerId && body.storyId) {
      const mediaAttempt = await runWithCandidates(candidates, async (client) => {
        const res = await client.invoke(
          new Api.stories.GetStoriesByID({
            peer: buildInputPeer(body.peerType || 'user', body.peerId!, body.accessHash || '0'),
            id: [Number(body.storyId)],
          })
        );
        const story = res.stories.find((s): s is Api.StoryItem => s instanceof Api.StoryItem && Boolean(s.media));
        if (!story?.media) return { dataUrl: null };
        const buf = (await withTimeout(
          client.downloadMedia(story.media, {}),
          15000,
          'downloadMedia timeout'
        )) as Buffer | string | undefined;
        if (!buf || typeof buf === 'string') return { dataUrl: null };

        let mimeType = 'image/jpeg';
        let isVideo = false;
        if (story.media instanceof Api.MessageMediaDocument && story.media.document instanceof Api.Document) {
          mimeType = story.media.document.mimeType || 'video/mp4';
          isVideo = mimeType.startsWith('video/');
        }
        const dataUrl = `data:${mimeType};base64,${Buffer.from(buf).toString('base64')}`;
        return { dataUrl, mimeType, isVideo };
      });
      if (mediaAttempt.error || !mediaAttempt.result) {
        return Response.json({ dataUrl: null, error: mediaAttempt.error });
      }
      return Response.json(mediaAttempt.result);
    }

    // Try candidate DC sessions (starting with primary defaultDcId) for 'list'
    const listAttempt = await runWithCandidates(candidates, (client) =>
      client.invoke(new Api.stories.GetAllStories({}))
    );

    if (!listAttempt.result || !listAttempt.client) {
      return Response.json(
        { stories: [], error: listAttempt.error || 'Could not load stories' },
        { status: 200 }
      );
    }

    const allRes = listAttempt.result;
    const activeClient = listAttempt.client;

    if (!(allRes instanceof Api.stories.AllStories)) {
      return Response.json({ stories: [], dcUsed: listAttempt.dcId });
    }

    const userMap = new Map<string, Api.User>();
    for (const u of allRes.users) {
      if (u instanceof Api.User) {
        userMap.set(String(u.id), u);
      }
    }

    const chatMap = new Map<string, Api.Chat | Api.Channel>();
    for (const c of allRes.chats) {
      if (c instanceof Api.Chat || c instanceof Api.Channel) {
        chatMap.set(String(c.id), c);
      }
    }

    const resolvedPeers = await Promise.all(
      allRes.peerStories.slice(0, 30).map(async (ps) => {
        let latest = [...ps.stories]
          .reverse()
          .find((s): s is Api.StoryItem => s instanceof Api.StoryItem);

        let peerType: 'user' | 'chat' | 'channel' = 'user';
        let rawId = '';
        if (ps.peer instanceof Api.PeerUser) {
          peerType = 'user';
          rawId = String(ps.peer.userId);
        } else if (ps.peer instanceof Api.PeerChannel) {
          peerType = 'channel';
          rawId = String(ps.peer.channelId);
        } else if (ps.peer instanceof Api.PeerChat) {
          peerType = 'chat';
          rawId = String(ps.peer.chatId);
        }
        if (!rawId) return null;

        const user = peerType === 'user' ? userMap.get(rawId) : undefined;
        const chat = peerType !== 'user' ? chatMap.get(rawId) : undefined;
        const accessHash =
          user?.accessHash?.toString() ??
          (chat instanceof Api.Channel ? chat.accessHash?.toString() : undefined) ??
          '0';

        // If Telegram only returned StoryItemSkipped, resolve the latest StoryItem via GetStoriesByID
        if (!latest && ps.stories.length > 0) {
          const lastSkipped = ps.stories[ps.stories.length - 1];
          if (lastSkipped && 'id' in lastSkipped) {
            try {
              const full = await withTimeout(
                activeClient.invoke(
                  new Api.stories.GetStoriesByID({
                    peer: buildInputPeer(peerType, rawId, accessHash),
                    id: [Number(lastSkipped.id)],
                  })
                ),
                4000,
                'GetStoriesByID timeout'
              );
              latest = full.stories.find((s): s is Api.StoryItem => s instanceof Api.StoryItem);
            } catch {}
          }
        }

        if (!latest) return null;

        const numId = Number(rawId) || 0;
        const name =
          peerType === 'user'
            ? [user?.firstName, user?.lastName].filter(Boolean).join(' ') || `User ${rawId}`
            : chat?.title || 'Channel';

        let photoId: string | undefined;
        if (user?.photo instanceof Api.UserProfilePhoto) {
          photoId = String(user.photo.photoId);
        } else if (chat && 'photo' in chat && chat.photo instanceof Api.ChatPhoto) {
          photoId = String(chat.photo.photoId);
        }

        const isVideo =
          latest.media instanceof Api.MessageMediaDocument &&
          latest.media.document instanceof Api.Document &&
          latest.media.document.mimeType?.startsWith('video/');

        return {
          id: Number(latest.id),
          peerId: numId,
          peerType,
          accessHash,
          name,
          letters: getInitials(name),
          color: getAvatarColor(numId),
          hasPhoto: Boolean(photoId),
          photoId,
          verified: Boolean(user?.verified || (chat instanceof Api.Channel && chat.verified)),
          seen: Boolean(ps.maxReadId && Number(latest.id) <= Number(ps.maxReadId)),
          text: latest.caption || '',
          date: Number(latest.date || Math.floor(Date.now() / 1000)),
          localMediaType: isVideo ? ('video' as const) : ('image' as const),
        };
      })
    );

    const items = resolvedPeers.filter((x): x is NonNullable<typeof x> => x !== null);
    return Response.json({ stories: items, dcUsed: listAttempt.dcId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load stories via GramJS';
    return Response.json({ stories: [], error: msg }, { status: 200 });
  }
}
