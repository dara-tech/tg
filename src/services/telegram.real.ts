'use client';
import { call } from '@/core/telegram/mtproto.client';
import { getAvatarColor, getInitials, type DialogMediaMeta, type ChatPermissions } from '@/store/dialogs.store';
import { useAuthStore } from '@/store/auth.store';

export type { ChatPermissions } from '@/store/dialogs.store';

export function isMTProtoConfigured(): boolean {
  const apiId = parseInt(process.env.NEXT_PUBLIC_API_ID ?? '0', 10);
  const apiHash = process.env.NEXT_PUBLIC_API_HASH ?? '';
  return Boolean(apiId && apiHash && apiHash !== 'placeholder');
}

export interface TextEntity {
  type: 'bold' | 'italic' | 'code' | 'pre' | 'url' | 'textUrl' | 'mention';
  offset: number;
  length: number;
  url?: string;
}

export interface WebPagePreview {
  url: string;
  siteName?: string;
  title?: string;
  description?: string;
}

export interface RealDialogItem {
  id: string;
  title: string;
  avatarLetters: string;
  avatarColor: string;
  lastMessage: string;
  lastMessageOut?: boolean;
  lastMessageRead?: boolean;
  lastMessageDate: number;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isOnline: boolean;
  peerType: 'user' | 'chat' | 'channel';
  peerId: number;
  accessHash?: string;
  readOutboxMaxId?: number;
  readInboxMaxId?: number;
  hasPhoto?: boolean;
  photoId?: string;
  dcId?: number;
  topMessageId?: number;
  isSavedMessages?: boolean;
  lastMessageMedia?: DialogMediaMeta;
  isBroadcast?: boolean;
  isMegagroup?: boolean;
  isCreator?: boolean;
  isAdmin?: boolean;
  isLeft?: boolean;
  permissions?: ChatPermissions;
}

export interface MediaAttachment {
  kind: 'photo' | 'voice' | 'video' | 'sticker' | 'document' | 'geo' | 'contact' | 'poll' | 'webpage';
  id: string;
  accessHash: string;
  fileReference?: Uint8Array;
  dcId?: number;
  thumbSize?: string;
  mimeType?: string;
  fileName?: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
  waveform?: Uint8Array;
  lat?: number;
  long?: number;
  title?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  pollQuestion?: string;
  pollOptions?: string[];
  webPage?: WebPagePreview;
  localUrl?: string;
}

export interface ReactionItem {
  emoji: string;
  count: number;
  chosen?: boolean;
}

export interface MessageSenderInfo {
  name: string;
  letters: string;
  color: string;
  peerType: 'user' | 'chat' | 'channel';
  peerId: number;
  accessHash?: string;
  hasPhoto?: boolean;
  photoId?: string;
}

export interface RealMessageItem {
  id: number;
  text: string;
  out: boolean;
  date: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: number;
  media?: MediaAttachment;
  groupedId?: string;
  albumMedia?: Array<{ id: number; media: MediaAttachment }>;
  entities?: TextEntity[];
  edited?: boolean;
  reactions?: ReactionItem[];
  isService?: boolean;
  forwardedFrom?: { name: string; chatId?: string };
  sender?: MessageSenderInfo;
}

export interface RealContactItem {
  id: number;
  accessHash?: string;
  name: string;
  username: string;
  phone: string;
  online: boolean;
  color: string;
  letters: string;
  hasPhoto?: boolean;
  photoId?: string;
  dcId?: number;
  topMessageId?: number;
  isSavedMessages?: boolean;
  lastMessageMedia?: DialogMediaMeta;
}

export interface RealStoryItem {
  id: number;
  peerId?: number;
  peerType?: 'user' | 'chat' | 'channel';
  accessHash?: string;
  name: string;
  letters?: string;
  color: string;
  hasPhoto?: boolean;
  photoId?: string;
  verified?: boolean;
  seen: boolean;
  text: string;
  date: number;
  media?: MediaAttachment;
  localMediaUrl?: string;
  localMediaType?: 'image' | 'video';
  isMine?: boolean;
}

export interface RealCallItem {
  id: number;
  peerId: number;
  name: string;
  color: string;
  type: 'incoming' | 'outgoing';
  missed: boolean;
  date: number;
  duration: string | null;
}

export interface StickerItem {
  id: string;
  accessHash: string;
  fileReference?: Uint8Array;
  dcId?: number;
  mimeType?: string;
  thumbSize?: string;
  alt: string;
}

export interface RawMedia {
  _: string;
  photo?: {
    id: string | number;
    access_hash: string;
    file_reference?: Uint8Array;
    dc_id?: number;
    sizes?: Array<{ type: string; w?: number; h?: number }>;
  };
  document?: {
    id: string | number;
    access_hash: string;
    file_reference?: Uint8Array;
    dc_id?: number;
    mime_type?: string;
    size?: string | number;
    attributes?: Array<{
      _: string;
      file_name?: string;
      duration?: number;
      w?: number;
      h?: number;
      voice?: boolean;
      alt?: string;
    }>;
  };
  geo?: { lat?: number; long?: number };
  title?: string;
  address?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  poll?: { question?: string; answers?: Array<{ text?: string }> };
  webpage?: { url?: string; site_name?: string; title?: string; description?: string };
}

function parseEntities(raw?: Array<{ _: string; offset: number; length: number; url?: string }>): TextEntity[] | undefined {
  if (!raw?.length) return undefined;
  const out: TextEntity[] = [];
  for (const e of raw) {
    if (e._ === 'messageEntityBold') out.push({ type: 'bold', offset: e.offset, length: e.length });
    else if (e._ === 'messageEntityItalic') out.push({ type: 'italic', offset: e.offset, length: e.length });
    else if (e._ === 'messageEntityCode') out.push({ type: 'code', offset: e.offset, length: e.length });
    else if (e._ === 'messageEntityPre') out.push({ type: 'pre', offset: e.offset, length: e.length });
    else if (e._ === 'messageEntityUrl') out.push({ type: 'url', offset: e.offset, length: e.length });
    else if (e._ === 'messageEntityTextUrl') out.push({ type: 'textUrl', offset: e.offset, length: e.length, url: e.url });
    else if (e._ === 'messageEntityMention') out.push({ type: 'mention', offset: e.offset, length: e.length });
  }
  return out.length ? out : undefined;
}

export function parseMedia(raw?: RawMedia): MediaAttachment | undefined {
  if (!raw) return undefined;

  if (raw._ === 'messageMediaPhoto' && raw.photo) {
    const sizes = (raw.photo.sizes ?? []).filter(
      (s) => s.type && s.type !== 'i' && (s as { _?: string })._ !== 'photoStrippedSize'
    );
    const preferred =
      sizes.find((s) => s.type === 'x') ??
      sizes.find((s) => s.type === 'm') ??
      sizes.find((s) => s.type === 'y') ??
      sizes.find((s) => s.type === 's') ??
      sizes[sizes.length - 1];
    return {
      kind: 'photo',
      id: String(raw.photo.id),
      accessHash: String(raw.photo.access_hash ?? '0'),
      fileReference: raw.photo.file_reference,
      dcId: raw.photo.dc_id,
      thumbSize: preferred?.type || 'm',
      width: preferred?.w,
      height: preferred?.h,
    };
  }

  if (raw._ === 'messageMediaDocument' && raw.document) {
    const attrs = raw.document.attributes ?? [];
    const fnAttr = attrs.find((a) => a._ === 'documentAttributeFilename');
    const audioAttr = attrs.find((a) => a._ === 'documentAttributeAudio') as {
      _?: string;
      voice?: boolean;
      duration?: number;
      waveform?: Uint8Array;
    } | undefined;
    const videoAttr = attrs.find((a) => a._ === 'documentAttributeVideo');
    const imageSizeAttr = attrs.find((a) => a._ === 'documentAttributeImageSize');
    const stickerAttr = attrs.find((a) => a._ === 'documentAttributeSticker');

    const isImageMime = raw.document.mime_type?.startsWith('image/');
    const isVideoMime = raw.document.mime_type?.startsWith('video/');
    const isAudioMime = raw.document.mime_type?.startsWith('audio/') || Boolean(fnAttr?.file_name?.startsWith('voice-'));

    const kind: MediaAttachment['kind'] = stickerAttr
      ? 'sticker'
      : audioAttr?.voice || isAudioMime
      ? 'voice'
      : videoAttr || isVideoMime
      ? 'video'
      : isImageMime
      ? 'photo'
      : 'document';

    const thumbs = (raw.document as { thumbs?: Array<{ _?: string; type?: string }> }).thumbs ?? [];
    const docThumb = thumbs.find((t) => t.type === 'm' || t.type === 's')?.type;

    return {
      kind,
      id: String(raw.document.id),
      accessHash: String(raw.document.access_hash ?? '0'),
      fileReference: raw.document.file_reference,
      dcId: raw.document.dc_id,
      mimeType: raw.document.mime_type,
      thumbSize:
        docThumb ||
        (kind === 'sticker' && raw.document.mime_type === 'application/x-tgsticker' ? 'm' : undefined) ||
        (kind === 'video' ? 'm' : undefined),
      fileName: fnAttr?.file_name || (stickerAttr?.alt ? `Sticker ${stickerAttr.alt}` : kind),
      size: Number(raw.document.size ?? 0) || undefined,
      duration: audioAttr?.duration ?? videoAttr?.duration,
      width: videoAttr?.w ?? imageSizeAttr?.w,
      height: videoAttr?.h ?? imageSizeAttr?.h,
      waveform: audioAttr?.waveform,
    };
  }

  if ((raw._ === 'messageMediaVenue' || raw._ === 'messageMediaGeo' || raw._ === 'messageMediaGeoLive') && raw.geo) {
    const rawVenue = raw as { title?: string; address?: string };
    const title = rawVenue.title
      ? `${rawVenue.title}${rawVenue.address ? ' · ' + rawVenue.address : ''}`
      : rawVenue.address;
    return {
      kind: 'geo',
      id: 'geo',
      accessHash: '0',
      lat: raw.geo.lat,
      long: raw.geo.long,
      title,
    };
  }

  if (raw._ === 'messageMediaContact') {
    return {
      kind: 'contact',
      id: 'contact',
      accessHash: '0',
      contactName: [raw.first_name, raw.last_name].filter(Boolean).join(' ') || 'Contact',
      contactPhone: raw.phone_number || '',
    };
  }

  if (raw._ === 'messageMediaPoll' && raw.poll) {
    return {
      kind: 'poll',
      id: 'poll',
      accessHash: '0',
      pollQuestion: raw.poll.question || 'Poll',
      pollOptions: (raw.poll.answers ?? []).map((a) => a.text || ''),
    };
  }

  if (raw._ === 'messageMediaWebPage' && raw.webpage?.url) {
    return {
      kind: 'webpage',
      id: 'webpage',
      accessHash: '0',
      webPage: {
        url: raw.webpage.url,
        siteName: raw.webpage.site_name,
        title: raw.webpage.title,
        description: raw.webpage.description,
      },
    };
  }

  return undefined;
}

export function toDialogMediaMeta(m?: MediaAttachment): DialogMediaMeta | undefined {
  if (!m) return undefined;
  return {
    kind: m.kind,
    id: m.id,
    accessHash: m.accessHash,
    fileReference: m.fileReference ? Array.from(m.fileReference) : undefined,
    dcId: m.dcId,
    thumbSize: m.thumbSize,
    mimeType: m.mimeType,
    fileName: m.fileName,
  };
}

export function getMediaPreviewLabel(m?: MediaAttachment): string {
  if (!m) return '';
  if (m.kind === 'photo') return 'Photo';
  if (m.kind === 'voice') return 'Voice message';
  if (m.kind === 'video') return 'Video';
  if (m.kind === 'sticker') return m.fileName || 'Sticker';
  if (m.kind === 'geo') return 'Location';
  if (m.kind === 'contact') return `Contact: ${m.contactName}`;
  if (m.kind === 'poll') return `Poll: ${m.pollQuestion}`;
  if (m.kind === 'webpage') return m.webPage?.title || 'Link';
  return m.fileName || 'Document';
}

let inFlightDialogs: Promise<RealDialogItem[]> | null = null;

export function fetchRealDialogs(
  limit = 40,
  offsetDate = 0,
  offsetId = 0,
  offsetPeerId = '',
  offsetAccessHash = '0'
): Promise<RealDialogItem[]> {
  if (offsetDate === 0 && inFlightDialogs) return inFlightDialogs;
  const p = _fetchRealDialogs(limit, offsetDate, offsetId, offsetPeerId, offsetAccessHash);
  if (offsetDate === 0) {
    inFlightDialogs = p.finally(() => {
      inFlightDialogs = null;
    });
  }
  return p;
}

export const chatPermissionsCache = new Map<string, ChatPermissions>();

export function computeChatPermissions(
  c?: {
    _: string;
    broadcast?: boolean;
    megagroup?: boolean;
    creator?: boolean;
    left?: boolean;
    deactivated?: boolean;
    kicked?: boolean;
    admin_rights?: {
      post_messages?: boolean;
      change_info?: boolean;
      invite_users?: boolean;
      pin_messages?: boolean;
      [key: string]: unknown;
    };
    banned_rights?: {
      send_messages?: boolean;
      send_media?: boolean;
      send_stickers?: boolean;
      send_polls?: boolean;
      pin_messages?: boolean;
      change_info?: boolean;
      invite_users?: boolean;
      until_date?: number;
      [key: string]: unknown;
    };
    default_banned_rights?: {
      send_messages?: boolean;
      send_media?: boolean;
      send_stickers?: boolean;
      send_polls?: boolean;
      pin_messages?: boolean;
      change_info?: boolean;
      invite_users?: boolean;
      [key: string]: unknown;
    };
  },
  peerType?: 'user' | 'chat' | 'channel'
): ChatPermissions {
  if (peerType === 'user' || !c) {
    return {
      isBroadcast: false,
      isMegagroup: false,
      isCreator: false,
      isAdmin: false,
      isLeft: false,
      canSendMessages: true,
      canSendMedia: true,
      canSendStickers: true,
      canSendPolls: true,
      canPinMessages: true,
      canChangeInfo: false,
      canInviteUsers: false,
    };
  }

  const isBroadcast = Boolean(c.broadcast);
  const isMegagroup = Boolean(c.megagroup);
  const isCreator = Boolean(c.creator);
  const isAdmin = Boolean(c.admin_rights);
  const isLeft = Boolean(c.left);
  const isDeactivated = Boolean(c.deactivated || c.kicked);

  // Check ban expiry
  const now = Math.floor(Date.now() / 1000);
  const isBanActive = Boolean(
    c.banned_rights && (!c.banned_rights.until_date || c.banned_rights.until_date === 0 || c.banned_rights.until_date > now)
  );

  // 1. Broadcast Channels
  if (isBroadcast) {
    if (isLeft) {
      return {
        isBroadcast: true,
        isMegagroup: false,
        isCreator,
        isAdmin,
        isLeft: true,
        canSendMessages: false,
        canSendMedia: false,
        canSendStickers: false,
        canSendPolls: false,
        canPinMessages: false,
        canChangeInfo: false,
        canInviteUsers: false,
        restrictionReason: 'Join channel to view updates',
      };
    }

    if (isCreator) {
      return {
        isBroadcast: true,
        isMegagroup: false,
        isCreator: true,
        isAdmin: true,
        isLeft: false,
        canSendMessages: true,
        canSendMedia: true,
        canSendStickers: true,
        canSendPolls: true,
        canPinMessages: true,
        canChangeInfo: true,
        canInviteUsers: true,
      };
    }

    if (isAdmin) {
      const canPost = Boolean(c.admin_rights?.post_messages);
      return {
        isBroadcast: true,
        isMegagroup: false,
        isCreator: false,
        isAdmin: true,
        isLeft: false,
        canSendMessages: canPost,
        canSendMedia: canPost,
        canSendStickers: canPost,
        canSendPolls: canPost,
        canPinMessages: Boolean(c.admin_rights?.pin_messages),
        canChangeInfo: Boolean(c.admin_rights?.change_info),
        canInviteUsers: Boolean(c.admin_rights?.invite_users),
        restrictionReason: canPost ? undefined : 'Only channel administrators can post messages',
      };
    }

    // Regular channel subscriber / viewer: cannot post in broadcast channels
    return {
      isBroadcast: true,
      isMegagroup: false,
      isCreator: false,
      isAdmin: false,
      isLeft: false,
      canSendMessages: false,
      canSendMedia: false,
      canSendStickers: false,
      canSendPolls: false,
      canPinMessages: false,
      canChangeInfo: false,
      canInviteUsers: false,
      restrictionReason: 'Channel is read-only',
    };
  }

  // 2. Groups and Supergroups
  if (isLeft) {
    return {
      isBroadcast: false,
      isMegagroup,
      isCreator,
      isAdmin,
      isLeft: true,
      canSendMessages: false,
      canSendMedia: false,
      canSendStickers: false,
      canSendPolls: false,
      canPinMessages: false,
      canChangeInfo: false,
      canInviteUsers: false,
      restrictionReason: 'You are no longer a member of this group',
    };
  }

  if (isDeactivated) {
    return {
      isBroadcast: false,
      isMegagroup,
      isCreator,
      isAdmin,
      isLeft: false,
      canSendMessages: false,
      canSendMedia: false,
      canSendStickers: false,
      canSendPolls: false,
      canPinMessages: false,
      canChangeInfo: false,
      canInviteUsers: false,
      restrictionReason: 'This group is deactivated',
    };
  }

  if (isCreator) {
    return {
      isBroadcast: false,
      isMegagroup,
      isCreator: true,
      isAdmin: true,
      isLeft: false,
      canSendMessages: true,
      canSendMedia: true,
      canSendStickers: true,
      canSendPolls: true,
      canPinMessages: true,
      canChangeInfo: true,
      canInviteUsers: true,
    };
  }

  if (isAdmin) {
    return {
      isBroadcast: false,
      isMegagroup,
      isCreator: false,
      isAdmin: true,
      isLeft: false,
      canSendMessages: true,
      canSendMedia: true,
      canSendStickers: true,
      canSendPolls: true,
      canPinMessages: Boolean(c.admin_rights?.pin_messages ?? true),
      canChangeInfo: Boolean(c.admin_rights?.change_info ?? true),
      canInviteUsers: Boolean(c.admin_rights?.invite_users ?? true),
    };
  }

  // Regular group member
  const bannedRights = isBanActive ? c.banned_rights : undefined;
  const defBanned = c.default_banned_rights;

  const isSendMsgBanned = Boolean(bannedRights?.send_messages || defBanned?.send_messages);
  const isSendMediaBanned = Boolean(bannedRights?.send_media || defBanned?.send_media);
  const isSendStickersBanned = Boolean(bannedRights?.send_stickers || defBanned?.send_stickers);
  const isSendPollsBanned = Boolean(bannedRights?.send_polls || defBanned?.send_polls);
  const isPinBanned = Boolean(bannedRights?.pin_messages ?? defBanned?.pin_messages ?? false);
  const isChangeInfoBanned = Boolean(bannedRights?.change_info ?? defBanned?.change_info ?? false);
  const isInviteBanned = Boolean(bannedRights?.invite_users ?? defBanned?.invite_users ?? false);

  let reason: string | undefined;
  if (isSendMsgBanned) {
    if (bannedRights?.send_messages) {
      reason = 'You were restricted from sending messages in this group';
    } else if (defBanned?.send_messages) {
      reason = 'The admins of this group have disabled sending messages';
    } else {
      reason = 'Sending messages is not allowed in this group';
    }
  }

  return {
    isBroadcast: false,
    isMegagroup,
    isCreator: false,
    isAdmin: false,
    isLeft: false,
    canSendMessages: !isSendMsgBanned,
    canSendMedia: !isSendMsgBanned && !isSendMediaBanned,
    canSendStickers: !isSendMsgBanned && !isSendStickersBanned,
    canSendPolls: !isSendMsgBanned && !isSendPollsBanned,
    canPinMessages: !isPinBanned,
    canChangeInfo: !isChangeInfoBanned,
    canInviteUsers: !isInviteBanned,
    restrictionReason: reason,
  };
}

export async function fetchChatPermissions(id: string, accessHash?: string): Promise<ChatPermissions | null> {
  if (id.startsWith('u_')) {
    return computeChatPermissions(undefined, 'user');
  }

  if (chatPermissionsCache.has(id)) {
    return chatPermissionsCache.get(id)!;
  }

  try {
    const rawNum = parseInt(id.split('_')[1] || '0', 10);
    if (!rawNum) return null;

    if (id.startsWith('c_')) {
      const hash = accessHash && accessHash !== '0' ? accessHash : (peerAccessHashMap.get(String(rawNum)) ?? '0');
      const res = await call<{ chats?: Array<{ [key: string]: unknown }> }>('channels.getChannels', {
        id: [{ _: 'inputChannel', channel_id: rawNum, access_hash: hash }],
      });
      const chat = res.chats?.[0] as any;
      if (chat) {
        const perms = computeChatPermissions(chat, chat.broadcast ? 'channel' : 'chat');
        chatPermissionsCache.set(id, perms);
        return perms;
      }
    } else if (id.startsWith('g_')) {
      const res = await call<{ chats?: Array<{ [key: string]: unknown }> }>('messages.getChats', {
        id: [rawNum],
      });
      const chat = res.chats?.[0] as any;
      if (chat) {
        const perms = computeChatPermissions(chat, 'chat');
        chatPermissionsCache.set(id, perms);
        return perms;
      }
    }
  } catch (err) {
    console.warn('[Permissions] Failed to fetch chat permissions:', err);
  }
  return null;
}

async function _fetchRealDialogs(
  limit = 40,
  offsetDate = 0,
  offsetId = 0,
  offsetPeerId = '',
  offsetAccessHash = '0'
): Promise<RealDialogItem[]> {
  const offset_peer = offsetPeerId
    ? buildInputPeer(offsetPeerId, offsetAccessHash)
    : { _: 'inputPeerEmpty' };

  const res = await call<{
    _: string;
    dialogs?: Array<{
      _: string;
      peer?: { _: string; user_id?: string | number; chat_id?: string | number; channel_id?: string | number };
      top_message?: number;
      read_inbox_max_id?: number;
      read_outbox_max_id?: number;
      unread_count?: number;
      pinned?: boolean;
      notify_settings?: { mute_until?: number };
    }>;
    messages?: Array<{
      id: number;
      out?: boolean;
      message?: string;
      date: number;
      media?: RawMedia;
      action?: { _: string };
    }>;
    users?: Array<{
      id: string | number;
      self?: boolean;
      first_name?: string;
      last_name?: string;
      access_hash?: string;
      status?: { _: string };
      photo?: { _: string; photo_id?: string | number };
    }>;
    chats?: Array<{
      id: string | number;
      title?: string;
      access_hash?: string;
      _: string;
      megagroup?: boolean;
      broadcast?: boolean;
      creator?: boolean;
      left?: boolean;
      deactivated?: boolean;
      kicked?: boolean;
      admin_rights?: any;
      banned_rights?: any;
      default_banned_rights?: any;
      photo?: { _: string; photo_id?: string | number };
    }>;
  }>('messages.getDialogs', {
    offset_date: offsetDate,
    offset_id: offsetId,
    offset_peer,
    limit,
    hash: 0,
  });

  for (const u of res.users ?? []) {
    if (u.id && u.access_hash) registerPeerAccessHash(u.id, u.access_hash);
  }
  for (const c of res.chats ?? []) {
    if (c.id && c.access_hash) registerPeerAccessHash(c.id, c.access_hash);
    if (c.id && c.megagroup) megagroupIds.add(Number(c.id));
  }

  const userMap = new Map((res.users ?? []).map((u) => [String(u.id), u]));
  const chatMap = new Map((res.chats ?? []).map((c) => [String(c.id), c]));
  const msgMap = new Map((res.messages ?? []).map((m) => [m.id, m]));

  const items: RealDialogItem[] = [];

  const myUserId = useAuthStore.getState().userId;

  for (const d of res.dialogs ?? []) {
    if (!d.peer || d._ === 'dialogFolder') continue;

    const topMsg = d.top_message ? msgMap.get(d.top_message) : undefined;
    const topMedia = parseMedia(topMsg?.media);
    const lastMessageMedia = toDialogMediaMeta(topMedia);
    const mediaLabel = getMediaPreviewLabel(topMedia);
    const preview = topMsg?.message || mediaLabel || (topMsg?.action ? 'Service message' : '');
    const isMuted = Boolean(d.notify_settings?.mute_until && d.notify_settings.mute_until > Date.now() / 1000);
    const outboxMax = d.read_outbox_max_id ?? 0;
    const isOut = Boolean(topMsg?.out);
    const isRead = isOut && topMsg ? topMsg.id <= outboxMax : false;

    if (d.peer.user_id !== undefined) {
      const uid = String(d.peer.user_id);
      const u = userMap.get(uid);
      const numId = Number(uid) || 0;
      const isSelf = Boolean(u?.self) || (myUserId !== null && numId === myUserId);
      const title = isSelf
        ? 'Saved Messages'
        : [u?.first_name, u?.last_name].filter(Boolean).join(' ') || `User ${uid}`;
      const photoId = isSelf
        ? undefined
        : u?.photo?.photo_id ?? (u?.photo as any)?.id
        ? String(u?.photo?.photo_id ?? (u?.photo as any)?.id)
        : undefined;
      const userDcId = u?.photo?.dc_id;
      const userPermissions = computeChatPermissions(undefined, 'user');
      items.push({
        id: `u_${uid}`,
        title,
        avatarLetters: isSelf ? 'SM' : getInitials(title) || 'U',
        avatarColor: isSelf ? '#2AABEE' : getAvatarColor(numId),
        lastMessage: preview,
        lastMessageOut: isOut,
        lastMessageRead: isRead,
        lastMessageDate: topMsg?.date || Math.floor(Date.now() / 1000),
        unreadCount: d.unread_count ?? 0,
        isPinned: Boolean(d.pinned),
        isMuted,
        isOnline: isSelf ? false : u?.status?._ === 'userStatusOnline',
        peerType: 'user',
        peerId: numId,
        accessHash: u?.access_hash ? String(u.access_hash) : '0',
        readOutboxMaxId: outboxMax,
        readInboxMaxId: d.read_inbox_max_id ?? 0,
        hasPhoto: Boolean(photoId),
        photoId,
        dcId: userDcId,
        topMessageId: d.top_message,
        isSavedMessages: isSelf,
        lastMessageMedia,
        permissions: userPermissions,
      });
      continue;
    }

    const rawCid = d.peer.channel_id ?? d.peer.chat_id;
    if (rawCid === undefined) continue;
    const cid = String(rawCid);
    const c = chatMap.get(cid);
    const title = c?.title || `Chat ${cid}`;
    const numId = Number(cid) || 0;
    const isMegagroup = Boolean(c?.megagroup);
    const isBroadcast = Boolean(c?.broadcast);
    if (isMegagroup) megagroupIds.add(numId);
    const peerType = d.peer.channel_id !== undefined && !isMegagroup ? 'channel' : 'chat';
    const photoId = c?.photo?.photo_id ?? (c?.photo as any)?.id
      ? String(c?.photo?.photo_id ?? (c?.photo as any)?.id)
      : undefined;
    const chatDcId = c?.photo?.dc_id;
    const permissions = computeChatPermissions(c as any, peerType);
    const peerKey = `${d.peer.channel_id !== undefined ? 'c' : 'g'}_${cid}`;
    chatPermissionsCache.set(peerKey, permissions);

    items.push({
      id: peerKey,
      title,
      avatarLetters: getInitials(title) || 'C',
      avatarColor: getAvatarColor(numId),
      lastMessage: preview,
      lastMessageOut: isOut,
      lastMessageRead: isRead,
      lastMessageDate: topMsg?.date || Math.floor(Date.now() / 1000),
      unreadCount: d.unread_count ?? 0,
      isPinned: Boolean(d.pinned),
      isMuted,
      isOnline: false,
      peerType,
      peerId: numId,
      accessHash: c?.access_hash ? String(c.access_hash) : '0',
      readOutboxMaxId: outboxMax,
      readInboxMaxId: d.read_inbox_max_id ?? 0,
      hasPhoto: Boolean(photoId),
      photoId,
      dcId: chatDcId,
      topMessageId: d.top_message,
      lastMessageMedia,
      isBroadcast,
      isMegagroup,
      isCreator: Boolean(c?.creator),
      isAdmin: Boolean(c?.admin_rights),
      isLeft: Boolean(c?.left),
      permissions,
    });
  }

  items.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.lastMessageDate - a.lastMessageDate;
  });

  return items;
}

const avatarBlobCache = new Map<string, string>();
const avatarPending = new Map<string, Promise<string | null>>();

export function downloadPeerAvatarUrl(
  peerType: 'user' | 'chat' | 'channel',
  peerId: number | string,
  accessHash = '0',
  photoId = '0',
  big = false,
  chatId?: string,
  dcId?: number
): Promise<string | null> {
  const pId = String(peerId);
  const key = `${peerType}_${pId}_${photoId}_${big ? 'big' : 'sm'}`;
  if (avatarBlobCache.has(key)) return Promise.resolve(avatarBlobCache.get(key)!);
  if (avatarPending.has(key)) return avatarPending.get(key)!;

  // Resolve whether this peer is a channel in MTProto:
  // In Telegram, any supergroup/megagroup or broadcast channel is a channel (channel_id + access_hash).
  let isChannel =
    peerType === 'channel' ||
    (chatId ? chatId.startsWith('c_') : false) ||
    megagroupIds.has(Number(pId));

  let hash = (accessHash && String(accessHash) !== '0')
    ? String(accessHash)
    : (peerAccessHashMap.get(pId) || '0');

  let targetDcId = dcId;

  try {
    const dialogs = useDialogsStore.getState().dialogs;
    const found = dialogs.find(
      (d) => String(d.peerId) === pId || (chatId && d.id === chatId) || d.id === `c_${pId}` || d.id === `g_${pId}`
    );
    if (found) {
      if (found.id.startsWith('c_') || found.isMegagroup || found.isBroadcast) {
        isChannel = true;
      }
      if (hash === '0' && found.accessHash && String(found.accessHash) !== '0') {
        hash = String(found.accessHash);
        peerAccessHashMap.set(pId, hash);
      }
      if (!targetDcId && found.dcId) {
        targetDcId = found.dcId;
      }
    }
  } catch {}

  const myUserId = useAuthStore.getState().userId;
  const isSelf = myUserId && (pId === String(myUserId) || chatId === `u_${myUserId}` || chatId === 'me');

  const peer = isSelf
    ? { _: 'inputPeerSelf' }
    : peerType === 'user'
    ? { _: 'inputPeerUser', user_id: pId, access_hash: hash }
    : isChannel
    ? { _: 'inputPeerChannel', channel_id: pId, access_hash: hash }
    : { _: 'inputPeerChat', chat_id: pId };

  const p = call<{ bytes?: Uint8Array }>(
    'upload.getFile',
    {
      location: { _: 'inputPeerPhotoFileLocation', big, peer, photo_id: photoId },
      offset: 0,
      limit: big ? 512 * 1024 : 64 * 1024,
    },
    targetDcId ? { dcId: targetDcId } : undefined
  )
    .then((res) => {
      if (!res.bytes) return null;
      const copy = new Uint8Array(res.bytes.byteLength);
      copy.set(res.bytes);
      const url = URL.createObjectURL(new Blob([copy.buffer], { type: 'image/jpeg' }));
      avatarBlobCache.set(key, url);
      return url;
    })
    .catch((err) => {
      // Automatic fallback: if inputPeerChat failed with CHAT_ID_INVALID/PEER_ID_INVALID, retry as channel!
      const errStr = String(err?.message || err?.error_message || err);
      if (!isChannel && (errStr.includes('CHAT_ID_INVALID') || errStr.includes('PEER_ID_INVALID') || errStr.includes('CHANNEL_INVALID'))) {
        return call<{ bytes?: Uint8Array }>(
          'upload.getFile',
          {
            location: {
              _: 'inputPeerPhotoFileLocation',
              big,
              peer: { _: 'inputPeerChannel', channel_id: pId, access_hash: hash },
              photo_id: photoId,
            },
            offset: 0,
            limit: big ? 512 * 1024 : 64 * 1024,
          },
          targetDcId ? { dcId: targetDcId } : undefined
        )
          .then((retryRes) => {
            if (!retryRes.bytes) return null;
            const copy = new Uint8Array(retryRes.bytes.byteLength);
            copy.set(retryRes.bytes);
            const url = URL.createObjectURL(new Blob([copy.buffer], { type: 'image/jpeg' }));
            avatarBlobCache.set(key, url);
            return url;
          })
          .catch(() => null);
      }
      return null;
    })
    .finally(() => avatarPending.delete(key));

  avatarPending.set(key, p);
  return p;
}

export async function fetchUserProfilePhotos(userId: number, accessHash = '0', limit = 8): Promise<MediaAttachment[]> {
  try {
    const hash = accessHash !== '0' ? accessHash : getPeerAccessHash(userId);
    const res = await call<{
      photos?: Array<{
        id: string | number;
        access_hash?: string | number;
        file_reference?: Uint8Array;
        dc_id?: number;
        sizes?: Array<{ _?: string; type?: string }>;
      }>;
    }>('photos.getUserPhotos', {
      user_id: { _: 'inputUser', user_id: String(userId), access_hash: hash },
      offset: 0,
      max_id: 0,
      limit,
    });
    return (res.photos ?? []).map((ph) => {
      const sizes = (ph.sizes ?? []).filter((s) => s.type && s.type !== 'i' && s._ !== 'photoStrippedSize');
      const preferred = sizes.find((s) => s.type === 'c') ?? sizes.find((s) => s.type === 'x') ?? sizes[sizes.length - 1];
      return {
        kind: 'photo',
        id: String(ph.id),
        accessHash: String(ph.access_hash ?? '0'),
        fileReference: ph.file_reference,
        dcId: ph.dc_id,
        thumbSize: preferred?.type || 'c',
      } satisfies MediaAttachment;
    });
  } catch {
    return [];
  }
}

export async function blockRealUser(userId: number, accessHash = '0', block = true) {
  const hash = accessHash !== '0' ? accessHash : getPeerAccessHash(userId);
  return call(block ? 'contacts.block' : 'contacts.unblock', {
    id: { _: 'inputPeerUser', user_id: String(userId), access_hash: hash },
  });
}

export async function clearRealHistory(chatId: string, accessHash = '0') {
  return call('messages.deleteHistory', {
    peer: buildInputPeer(chatId, accessHash),
    max_id: 0,
    revoke: false,
  });
}

const peerAccessHashMap = new Map<string, string>();
const megagroupIds = new Set<number>();

export function registerPeerAccessHash(peerId: string | number, accessHash?: string | number) {
  if (peerId && accessHash && String(accessHash) !== '0') {
    peerAccessHashMap.set(String(peerId), String(accessHash));
  }
}

export function getPeerAccessHash(peerId: string | number): string {
  return peerAccessHashMap.get(String(peerId)) || '0';
}

export function withTimeout<T>(promise: Promise<T>, ms = 12000, errorMsg = 'Operation timed out'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
}

function buildInputPeer(id: string, accessHash = '0') {
  if (id === 'me' || id === 'self') {
    return { _: 'inputPeerSelf' };
  }
  const [prefix, rawId] = id.split('_');
  const peerId = rawId || id;

  const myUserId = useAuthStore.getState().userId;
  if (myUserId && (String(peerId) === String(myUserId) || id === `u_${myUserId}`)) {
    return { _: 'inputPeerSelf' };
  }

  let hash = (accessHash && String(accessHash) !== '0')
    ? String(accessHash)
    : (peerAccessHashMap.get(String(peerId)) || '0');

  // Fallback: resolve missing accessHash from loaded dialogs store
  if (hash === '0') {
    try {
      const dialogs = useDialogsStore.getState().dialogs;
      const found = dialogs.find(
        (d) => d.id === id || String(d.peerId) === String(peerId)
      );
      if (found?.accessHash && String(found.accessHash) !== '0') {
        hash = String(found.accessHash);
        peerAccessHashMap.set(String(peerId), hash);
      }
    } catch {}
  }

  if (prefix === 'u') return { _: 'inputPeerUser', user_id: peerId, access_hash: hash };
  if (prefix === 'c') return { _: 'inputPeerChannel', channel_id: peerId, access_hash: hash };
  return { _: 'inputPeerChat', chat_id: peerId };
}

export function parseReactions(raw?: {
  results?: Array<{ reaction?: { _?: string; emoticon?: string }; count?: number; chosen_order?: number }>;
}): ReactionItem[] | undefined {
  if (!raw?.results?.length) return undefined;
  const out: ReactionItem[] = [];
  for (const r of raw.results) {
    if (r.reaction?._ === 'reactionEmoji' && r.reaction.emoticon) {
      out.push({
        emoji: r.reaction.emoticon,
        count: r.count ?? 1,
        chosen: r.chosen_order !== undefined,
      });
    }
  }
  return out.length ? out : undefined;
}

function formatServiceAction(action?: { _?: string; title?: string; duration?: number }): string {
  switch (action?._) {
    case 'messageActionChannelCreate':
      return action.title ? `Channel «${action.title}» created` : 'Channel created';
    case 'messageActionChatCreate':
      return action.title ? `Group «${action.title}» created` : 'Group created';
    case 'messageActionChatEditTitle':
      return action.title ? `Title changed to «${action.title}»` : 'Title updated';
    case 'messageActionChatEditPhoto':
      return 'Photo updated';
    case 'messageActionChatDeletePhoto':
      return 'Photo removed';
    case 'messageActionPinMessage':
      return 'Pinned a message';
    case 'messageActionChatAddUser':
    case 'messageActionChatJoinedByLink':
      return 'Joined the chat';
    case 'messageActionChatDeleteUser':
      return 'Left the chat';
    case 'messageActionPhoneCall':
      return action.duration ? `Call (${Math.ceil(action.duration / 60)}m)` : 'Call';
    case 'messageActionGroupCall':
      return 'Voice chat';
    case 'messageActionHistoryClear':
      return 'History cleared';
    default:
      return action?._ ? 'Service message' : '';
  }
}

export async function fetchRealHistory(
  chatId: string,
  accessHash = '0',
  limit = 25,
  readOutboxMaxId = 0,
  offsetId = 0
): Promise<RealMessageItem[]> {
  const res = await withTimeout(
    call<{
      messages?: Array<{
        _?: string;
        id: number;
        message?: string;
        out?: boolean;
        date: number;
        edit_date?: number;
        grouped_id?: string | number;
        media?: RawMedia;
        action?: { _?: string; title?: string; duration?: number };
        from_id?: { user_id?: string | number; channel_id?: string | number; chat_id?: string | number };
        fwd_from?: {
          from_name?: string;
          post_author?: string;
          from_id?: { user_id?: string | number; channel_id?: string | number; chat_id?: string | number };
        };
        entities?: Array<{ _: string; offset: number; length: number; url?: string }>;
        reply_to?: { reply_to_msg_id?: number };
        reactions?: { results?: Array<{ reaction?: { _?: string; emoticon?: string }; count?: number; chosen_order?: number }> };
      }>;
      users?: Array<{
        id: string | number;
        access_hash?: string | number;
        first_name?: string;
        last_name?: string;
        photo?: { _: string; photo_id?: string | number };
      }>;
      chats?: Array<{
        _: string;
        id: string | number;
        access_hash?: string | number;
        title?: string;
        megagroup?: boolean;
        photo?: { _: string; photo_id?: string | number };
      }>;
    }>('messages.getHistory', {
      peer: buildInputPeer(chatId, accessHash),
      offset_id: offsetId,
      offset_date: 0,
      add_offset: 0,
      limit,
      max_id: 0,
      min_id: 0,
      hash: 0,
    }),
    12000,
    'Failed to load messages (network timeout)'
  );

  const fwdUsers = new Map<string, string>();
  const fwdChats = new Map<string, string>();
  const histUserMap = new Map<string, NonNullable<typeof res.users>[number]>();
  const histChatMap = new Map<string, NonNullable<typeof res.chats>[number]>();
  for (const u of res.users ?? []) {
    if (u.id && u.access_hash) registerPeerAccessHash(u.id, u.access_hash);
    if (u.id) {
      histUserMap.set(String(u.id), u);
      const n = [u.first_name, u.last_name].filter(Boolean).join(' ');
      if (n) fwdUsers.set(String(u.id), n);
    }
  }
  for (const c of res.chats ?? []) {
    if (c.id && c.access_hash) registerPeerAccessHash(c.id, c.access_hash);
    if (c.id && c.megagroup) megagroupIds.add(Number(c.id));
    if (c.id) {
      histChatMap.set(String(c.id), c);
      if (c.title) fwdChats.set(String(c.id), c.title);
    }
  }

  return (res.messages ?? [])
    .slice()
    .reverse()
    .filter((m): m is NonNullable<typeof m> & { id: number } => {
      return Boolean(m && m._ !== 'messageEmpty' && typeof m.id === 'number');
    })
    .map((m) => {
      const media = parseMedia(m.media);
      const isOut = Boolean(m.out);
      const isService = m._ === 'messageService' || Boolean(m.action);
      const serviceText = isService ? formatServiceAction(m.action) : '';
      const safeDate = (typeof m.date === 'number' && !isNaN(m.date) && m.date > 0)
        ? m.date
        : Math.floor(Date.now() / 1000);
      let sender: MessageSenderInfo | undefined;
      if (m.from_id?.user_id !== undefined) {
        const uid = String(m.from_id.user_id);
        const u = histUserMap.get(uid);
        const numId = Number(uid) || 0;
        const sName = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || `User ${uid}`;
        const photoId = u?.photo?._ === 'userProfilePhoto' && u.photo.photo_id ? String(u.photo.photo_id) : undefined;
        sender = {
          name: sName,
          letters: getInitials(sName) || 'U',
          color: getAvatarColor(numId),
          peerType: 'user',
          peerId: numId,
          accessHash: u?.access_hash ? String(u.access_hash) : '0',
          hasPhoto: Boolean(photoId),
          photoId,
        };
      } else if (m.from_id?.channel_id !== undefined || m.from_id?.chat_id !== undefined) {
        const rawCid = String(m.from_id.channel_id ?? m.from_id.chat_id);
        const c = histChatMap.get(rawCid);
        const numId = Number(rawCid) || 0;
        const sName = c?.title || `Chat ${rawCid}`;
        const photoId = c?.photo?._ === 'chatPhoto' && c.photo.photo_id ? String(c.photo.photo_id) : undefined;
        sender = {
          name: sName,
          letters: getInitials(sName) || 'C',
          color: getAvatarColor(numId),
          peerType: m.from_id.channel_id !== undefined && !c?.megagroup ? 'channel' : 'chat',
          peerId: numId,
          accessHash: c?.access_hash ? String(c.access_hash) : '0',
          hasPhoto: Boolean(photoId),
          photoId,
        };
      }
      let forwardedFrom: { name: string; chatId?: string } | undefined;
      if (m.fwd_from) {
        const fid = m.fwd_from.from_id;
        if (fid?.user_id !== undefined) {
          const uid = String(fid.user_id);
          forwardedFrom = { name: fwdUsers.get(uid) || m.fwd_from.from_name || `User ${uid}`, chatId: `u_${uid}` };
        } else if (fid?.channel_id !== undefined) {
          const cid = String(fid.channel_id);
          const base = fwdChats.get(cid) || m.fwd_from.from_name || `Channel ${cid}`;
          forwardedFrom = { name: m.fwd_from.post_author ? `${base} (${m.fwd_from.post_author})` : base, chatId: `c_${cid}` };
        } else if (fid?.chat_id !== undefined) {
          const gid = String(fid.chat_id);
          forwardedFrom = { name: fwdChats.get(gid) || m.fwd_from.from_name || `Group ${gid}`, chatId: `g_${gid}` };
        } else if (m.fwd_from.from_name || m.fwd_from.post_author) {
          forwardedFrom = { name: m.fwd_from.from_name || m.fwd_from.post_author || 'Forwarded' };
        }
      }
      return {
        id: m.id,
        text: m.message || serviceText || (media ? '' : 'Message'),
        out: isOut,
        date: safeDate,
        status: isOut ? (readOutboxMaxId && m.id <= readOutboxMaxId ? 'read' : 'sent') : 'read',
        replyTo: m.reply_to?.reply_to_msg_id,
        media,
        groupedId: m.grouped_id ? String(m.grouped_id) : undefined,
        entities: parseEntities(m.entities),
        edited: Boolean(m.edit_date),
        reactions: parseReactions(m.reactions),
        isService,
        forwardedFrom,
        sender,
      };
    });
}

export async function markHistoryRead(chatId: string, maxId: number, accessHash = '0') {
  if (!maxId) return;
  if (chatId.startsWith('c_')) {
    const channelId = chatId.split('_')[1] || '0';
    return call('channels.readHistory', {
      channel: { _: 'inputChannel', channel_id: channelId, access_hash: accessHash },
      max_id: maxId,
    });
  }
  return call('messages.readHistory', {
    peer: buildInputPeer(chatId, accessHash),
    max_id: maxId,
  });
}

const mediaBlobCache = new Map<string, string>();
const mediaPending = new Map<string, Promise<string | null>>();

async function fetchFileBytes(
  location: Record<string, unknown>,
  dcId?: number,
  maxBytes = 8 * 1024 * 1024
): Promise<Uint8Array | null> {
  const chunkSize = 512 * 1024;
  const chunks: Uint8Array[] = [];
  let offset = 0;

  while (offset < maxBytes) {
    const callPromise = call<{ bytes?: Uint8Array }>(
      'upload.getFile',
      { location, offset, limit: chunkSize },
      dcId ? { dcId } : undefined
    );
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('DOWNLOAD_CHUNK_TIMEOUT')), 12000);
    });

    let res: { bytes?: Uint8Array };
    try {
      res = await Promise.race([callPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (!res.bytes || res.bytes.byteLength === 0) break;
    const copy = new Uint8Array(res.bytes.byteLength);
    copy.set(res.bytes);
    chunks.push(copy);
    offset += copy.byteLength;
    if (copy.byteLength < chunkSize) break;
  }

  if (chunks.length === 0) return null;
  if (chunks.length === 1) return chunks[0];
  const merged = new Uint8Array(offset);
  let pos = 0;
  for (const c of chunks) {
    merged.set(c, pos);
    pos += c.byteLength;
  }
  return merged;
}

export async function downloadMediaUrl(media: MediaAttachment, thumbOnly = false): Promise<string | null> {
  const isPhotoLocation = media.kind === 'photo' && !media.mimeType;
  const isDocThumb =
    (media.kind === 'sticker' && (Boolean(media.thumbSize) || media.mimeType === 'application/x-tgsticker')) ||
    (thumbOnly && media.kind === 'video' && Boolean(media.thumbSize));

  const targetThumb = thumbOnly ? 's' : (media.thumbSize || 'x');
  const cacheKey = `${media.kind}_${media.id}_${thumbOnly ? `thumb_${targetThumb}` : targetThumb}`;
  if (mediaBlobCache.has(cacheKey)) return mediaBlobCache.get(cacheKey)!;
  if (mediaPending.has(cacheKey)) return mediaPending.get(cacheKey)!;

  const p = (async () => {
    try {
      const makeLocation = (thumb?: string) =>
        isPhotoLocation
          ? {
              _: 'inputPhotoFileLocation',
              id: media.id,
              access_hash: media.accessHash,
              file_reference: media.fileReference ?? new Uint8Array(),
              thumb_size: thumb || media.thumbSize || 'x',
            }
          : {
              _: 'inputDocumentFileLocation',
              id: media.id,
              access_hash: media.accessHash,
              file_reference: media.fileReference ?? new Uint8Array(),
              thumb_size: isDocThumb ? (thumb || media.thumbSize || 'm') : '',
            };

      let bytes: Uint8Array | null = null;
      try {
        bytes = await fetchFileBytes(makeLocation(targetThumb), media.dcId);
      } catch {
        // Fallback size cascade: try other available thumbnail sizes
        const fallbacks = isPhotoLocation ? ['m', 's', 'y'].filter((s) => s !== targetThumb) : isDocThumb ? ['s', 'm'] : [];
        for (const fb of fallbacks) {
          try {
            bytes = await fetchFileBytes(makeLocation(fb), media.dcId);
            if (bytes) break;
          } catch {}
        }
      }

      if (!bytes) return null;
      const mime = isPhotoLocation
        ? 'image/jpeg'
        : isDocThumb
        ? 'image/webp'
        : media.mimeType || 'application/octet-stream';
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
      const url = URL.createObjectURL(blob);
      mediaBlobCache.set(cacheKey, url);
      return url;
    } catch {
      return null;
    } finally {
      mediaPending.delete(cacheKey);
    }
  })();

  mediaPending.set(cacheKey, p);
  return p;
}

export async function sendRealTextMessage(chatId: string, text: string, accessHash = '0', replyToMsgId?: number): Promise<number | undefined> {
  const res = await call<{
    id?: number;
    updates?: Array<{ _: string; id?: number; message?: { id?: number } }>;
  }>('messages.sendMessage', {
    peer: buildInputPeer(chatId, accessHash),
    message: text,
    random_id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    ...(replyToMsgId ? { reply_to_msg_id: replyToMsgId } : {}),
  });
  if (res?.id) return res.id;
  const msgIdUpdate = res?.updates?.find((u) => u._ === 'updateMessageID' || u.message?.id);
  return msgIdUpdate?.id ?? msgIdUpdate?.message?.id;
}

export async function fetchPeerReadOutboxMaxId(chatId: string, accessHash = '0'): Promise<number> {
  try {
    const res = await call<{
      dialogs?: Array<{ read_outbox_max_id?: number }>;
    }>('messages.getPeerDialogs', {
      peers: [{ _: 'inputDialogPeer', peer: buildInputPeer(chatId, accessHash) }],
    });
    return res.dialogs?.[0]?.read_outbox_max_id ?? 0;
  } catch {
    return 0;
  }
}

export async function editRealMessage(chatId: string, msgId: number, text: string, accessHash = '0') {
  return call('messages.editMessage', {
    peer: buildInputPeer(chatId, accessHash),
    id: msgId,
    message: text,
  });
}

export async function pinRealMessage(chatId: string, msgId: number, unpin = false, accessHash = '0') {
  return call('messages.updatePinnedMessage', {
    peer: buildInputPeer(chatId, accessHash),
    id: msgId,
    unpin,
  });
}

export async function fetchPinnedMessage(chatId: string, accessHash = '0'): Promise<RealMessageItem | null> {
  try {
    const res = await call<{
      messages?: Array<{ id: number; message?: string; out?: boolean; date: number }>;
    }>('messages.search', {
      peer: buildInputPeer(chatId, accessHash),
      q: '',
      filter: { _: 'inputMessagesFilterPinned' },
      min_date: 0,
      max_date: 0,
      offset_id: 0,
      add_offset: 0,
      limit: 1,
      max_id: 0,
      min_id: 0,
      hash: 0,
    });
    const m = res.messages?.[0];
    if (!m) return null;
    return { id: m.id, text: m.message || 'Pinned message', out: Boolean(m.out), date: m.date, status: 'read' };
  } catch {
    return null;
  }
}

export type TypingActionType =
  | 'sendMessageTypingAction'
  | 'sendMessageRecordAudioAction'
  | 'sendMessageUploadAudioAction'
  | 'sendMessageRecordVideoAction'
  | 'sendMessageUploadVideoAction'
  | 'sendMessageUploadPhotoAction'
  | 'sendMessageUploadDocumentAction'
  | 'sendMessageChooseStickerAction'
  | 'sendMessageCancelAction';

export async function sendTyping(chatId: string, accessHash = '0', action: TypingActionType = 'sendMessageTypingAction') {
  return call('messages.setTyping', {
    peer: buildInputPeer(chatId, accessHash),
    action: { _: action },
  }).catch(() => {});
}

export async function deleteRealMessages(ids: number[]) {
  return call('messages.deleteMessages', { id: ids, revoke: true });
}

export async function createRealGroup(title: string, userIds: number[]) {
  return call('messages.createChat', {
    title,
    users: userIds.map((id) => ({ _: 'inputUser', user_id: String(id), access_hash: '0' })),
  });
}

export async function createRealChannel(title: string, about = '') {
  return call('channels.createChannel', {
    broadcast: true,
    title,
    about,
  });
}

export interface StickerSetItem {
  id: string;
  accessHash: string;
  title: string;
  shortName?: string;
  stickers: StickerItem[];
}

function mapStickerDocs(
  docs?: Array<{
    id: string | number;
    access_hash: string;
    file_reference?: Uint8Array;
    dc_id?: number;
    mime_type?: string;
    thumbs?: Array<{ _?: string; type?: string }>;
    attributes?: Array<{ _: string; alt?: string }>;
  }>
): StickerItem[] {
  return (docs ?? []).map((d) => {
    const thumb = d.thumbs?.find((t) => t.type === 'm' || t.type === 's')?.type;
    return {
      id: String(d.id),
      accessHash: String(d.access_hash ?? '0'),
      fileReference: d.file_reference,
      dcId: d.dc_id,
      mimeType: d.mime_type,
      thumbSize: thumb || (d.mime_type === 'application/x-tgsticker' ? 'm' : undefined),
      alt: d.attributes?.find((a) => a._ === 'documentAttributeSticker')?.alt || '🧩',
    };
  });
}

export async function fetchRealStickerSets(): Promise<{ favorites: StickerItem[]; sets: StickerSetItem[] }> {
  try {
    const [all, faved] = await Promise.all([
      call<{ sets?: Array<{ id: string; access_hash: string; title?: string; short_name?: string }> }>(
        'messages.getAllStickers',
        { hash: 0 }
      ).catch(() => ({ sets: [] })),
      call<{
        stickers?: Array<{
          id: string | number;
          access_hash: string;
          file_reference?: Uint8Array;
          dc_id?: number;
          mime_type?: string;
          attributes?: Array<{ _: string; alt?: string }>;
        }>;
      }>('messages.getFavedStickers', { hash: 0 }).catch(() => ({ stickers: [] })),
    ]);

    const favorites = mapStickerDocs(faved.stickers).slice(0, 24);
    const targetSets = (all.sets ?? []).slice(0, 6);
    const loadedSets = await Promise.all(
      targetSets.map(async (s): Promise<StickerSetItem | null> => {
        try {
          const setRes = await call<{
            documents?: Array<{
              id: string | number;
              access_hash: string;
              file_reference?: Uint8Array;
              dc_id?: number;
              mime_type?: string;
              attributes?: Array<{ _: string; alt?: string }>;
            }>;
          }>('messages.getStickerSet', {
            stickerset: { _: 'inputStickerSetID', id: s.id, access_hash: s.access_hash },
            hash: 0,
          });
          return {
            id: String(s.id),
            accessHash: String(s.access_hash ?? '0'),
            title: s.title || s.short_name || 'Stickers',
            shortName: s.short_name,
            stickers: mapStickerDocs(setRes.documents).slice(0, 24),
          };
        } catch {
          return null;
        }
      })
    );

    return {
      favorites,
      sets: loadedSets.filter((x): x is StickerSetItem => Boolean(x && x.stickers.length > 0)),
    };
  } catch {
    return { favorites: [], sets: [] };
  }
}

export async function fetchSavedGifs(): Promise<StickerItem[]> {
  try {
    const res = await call<{
      gifs?: Array<{
        id: string | number;
        access_hash: string;
        file_reference?: Uint8Array;
        dc_id?: number;
        mime_type?: string;
      }>;
    }>('messages.getSavedGifs', { hash: 0 });
    return (res.gifs ?? []).slice(0, 24).map((g) => ({
      id: String(g.id),
      accessHash: String(g.access_hash ?? '0'),
      fileReference: g.file_reference,
      dcId: g.dc_id,
      mimeType: g.mime_type || 'video/mp4',
      alt: 'GIF',
    }));
  } catch {
    return [];
  }
}

export async function fetchRealStickers(): Promise<StickerItem[]> {
  const { favorites, sets } = await fetchRealStickerSets();
  if (favorites.length > 0) return favorites;
  return sets[0]?.stickers ?? [];
}

export async function sendRealSticker(chatId: string, sticker: StickerItem, accessHash = '0') {
  return call('messages.sendMedia', {
    peer: buildInputPeer(chatId, accessHash),
    media: {
      _: 'inputMediaDocument',
      id: {
        _: 'inputDocument',
        id: sticker.id,
        access_hash: sticker.accessHash,
        file_reference: sticker.fileReference ?? new Uint8Array(),
      },
    },
    message: '',
    random_id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  });
}

export async function sendRealPoll(chatId: string, question: string, options: string[], accessHash = '0') {
  return call('messages.sendMedia', {
    peer: buildInputPeer(chatId, accessHash),
    media: {
      _: 'inputMediaPoll',
      poll: {
        _: 'poll',
        id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
        question,
        answers: options.map((text, i) => ({
          _: 'pollAnswer',
          text,
          option: new Uint8Array([48 + i]),
        })),
      },
    },
    message: '',
    random_id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  });
}

export async function sendRealGeo(chatId: string, lat: number, long: number, accessHash = '0') {
  return call('messages.sendMedia', {
    peer: buildInputPeer(chatId, accessHash),
    media: {
      _: 'inputMediaGeoPoint',
      geo_point: { _: 'inputGeoPoint', lat, long },
    },
    message: '',
    random_id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  });
}

export async function sendRealContact(
  chatId: string,
  phone: string,
  firstName: string,
  lastName = '',
  accessHash = '0'
) {
  return call('messages.sendMedia', {
    peer: buildInputPeer(chatId, accessHash),
    media: {
      _: 'inputMediaContact',
      phone_number: phone,
      first_name: firstName,
      last_name: lastName,
      vcard: '',
    },
    message: '',
    random_id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  });
}

export async function fetchRealContacts(): Promise<RealContactItem[]> {
  const res = await call<{
    users?: Array<{
      id: string | number;
      access_hash?: string;
      first_name?: string;
      last_name?: string;
      username?: string;
      phone?: string;
      status?: { _: string };
      photo?: { _: string; photo_id?: string | number };
    }>;
  }>('contacts.getContacts', { hash: 0 });

  for (const u of res.users ?? []) {
    if (u.id && u.access_hash) registerPeerAccessHash(u.id, u.access_hash);
  }

  return (res.users ?? []).map((u) => {
    const numId = Number(u.id) || 0;
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || `User ${u.id}`;
    const photoId = u.photo?.photo_id ? String(u.photo.photo_id) : undefined;
    return {
      id: numId,
      accessHash: u.access_hash ? String(u.access_hash) : '0',
      name,
      username: u.username ? `@${u.username}` : '',
      phone: u.phone ? `+${u.phone}` : '',
      online: u.status?._ === 'userStatusOnline',
      color: getAvatarColor(numId),
      letters: getInitials(name) || 'U',
      hasPhoto: Boolean(photoId),
      photoId,
    };
  });
}

export async function searchGlobal(q: string): Promise<RealDialogItem[]> {
  const res = await call<{
    users?: Array<{ id: string | number; first_name?: string; last_name?: string; access_hash?: string; status?: { _: string } }>;
    chats?: Array<{ id: string | number; title?: string; access_hash?: string; megagroup?: boolean; _: string }>;
  }>('contacts.search', { q, limit: 20 });

  for (const u of res.users ?? []) {
    if (u.id && u.access_hash) registerPeerAccessHash(u.id, u.access_hash);
  }
  for (const c of res.chats ?? []) {
    if (c.id && c.access_hash) registerPeerAccessHash(c.id, c.access_hash);
    if (c.id && c.megagroup) megagroupIds.add(Number(c.id));
  }

  const users: RealDialogItem[] = (res.users ?? []).map((u) => {
    const numId = Number(u.id) || 0;
    const title = [u.first_name, u.last_name].filter(Boolean).join(' ') || `User ${u.id}`;
    return {
      id: `u_${u.id}`,
      title,
      avatarLetters: getInitials(title) || 'U',
      avatarColor: getAvatarColor(numId),
      lastMessage: '',
      lastMessageDate: 0,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isOnline: u.status?._ === 'userStatusOnline',
      peerType: 'user',
      peerId: numId,
      accessHash: u.access_hash ? String(u.access_hash) : '0',
    };
  });

  const chats: RealDialogItem[] = (res.chats ?? []).map((c) => {
    const numId = Number(c.id) || 0;
    const title = c.title || `Chat ${c.id}`;
    const isChannel = c._ === 'channel';
    return {
      id: `${isChannel ? 'c' : 'g'}_${c.id}`,
      title,
      avatarLetters: getInitials(title) || 'C',
      avatarColor: getAvatarColor(numId),
      lastMessage: '',
      lastMessageDate: 0,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isOnline: false,
      peerType: isChannel && !c.megagroup ? 'channel' : 'chat',
      peerId: numId,
      accessHash: c.access_hash ? String(c.access_hash) : '0',
    };
  });

  return [...users, ...chats];
}

function parseStoredAuthKey(rawKey: string | null): number[] | null {
  if (!rawKey) return null;
  try {
    const parsed = JSON.parse(rawKey);
    const arr = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray(parsed.data)
      ? parsed.data
      : Object.values(parsed || {});
    if (Array.isArray(arr) && arr.length >= 32) {
      return arr.map(Number);
    }
  } catch {}
  return null;
}

function getAllMTProtoCredentials(): Array<{ dcId: number; authKey: number[] }> {
  if (typeof window === 'undefined') return [];
  const results: Array<{ dcId: number; authKey: number[] }> = [];
  const seen = new Set<number>();
  let preferredDc = 5;
  try {
    const rawDc = window.localStorage.getItem('defaultDcId');
    if (rawDc) preferredDc = Number(JSON.parse(rawDc)) || 5;
  } catch {}

  const discoveredDcs: number[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      const m = k?.match(/^(\d+)authKey$/);
      if (m) discoveredDcs.push(Number(m[1]));
    }
  } catch {}

  for (const dcId of [preferredDc, 5, 4, 2, 1, 3, ...discoveredDcs]) {
    if (!dcId || seen.has(dcId)) continue;
    seen.add(dcId);
    const key = parseStoredAuthKey(window.localStorage.getItem(`${dcId}authKey`));
    if (key) results.push({ dcId, authKey: key });
  }
  return results;
}

function getMTProtoSessionCredentials(): { dcId: number; authKey: number[] } | null {
  return getAllMTProtoCredentials()[0] ?? null;
}

export async function fetchRealStories(): Promise<RealStoryItem[]> {
  const candidates = getAllMTProtoCredentials();
  if (candidates.length === 0) return [];
  try {
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', ...candidates[0], candidates }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { stories?: RealStoryItem[]; error?: string };
    if (data.error) {
      console.warn('[GramJS Stories]', data.error);
    }
    const stories = data.stories ?? [];
    for (const s of stories) {
      if (s.peerId && s.accessHash) registerPeerAccessHash(s.peerId, s.accessHash);
    }
    return stories;
  } catch {
    return [];
  }
}

export async function fetchStoryMediaUrl(story: RealStoryItem): Promise<string | null> {
  if (story.localMediaUrl) return story.localMediaUrl;
  const candidates = getAllMTProtoCredentials();
  if (candidates.length === 0 || !story.peerId || !story.id) return null;
  try {
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'media',
        ...candidates[0],
        candidates,
        peerType: story.peerType || 'user',
        peerId: story.peerId,
        accessHash: story.accessHash || '0',
        storyId: story.id,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { dataUrl?: string | null };
    return data.dataUrl || null;
  } catch {
    return null;
  }
}

export async function markStoryReadReal(story: RealStoryItem): Promise<void> {
  if (story.isMine || !story.peerId || !story.id) return;
  const candidates = getAllMTProtoCredentials();
  if (candidates.length === 0) return;
  await fetch('/api/stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'read',
      ...candidates[0],
      candidates,
      peerType: story.peerType || 'user',
      peerId: story.peerId,
      accessHash: story.accessHash || '0',
      storyId: story.id,
    }),
  }).catch(() => {});
}

export async function fetchRealCallHistory(): Promise<RealCallItem[]> {
  const res = await call<{
    messages?: Array<{
      id: number;
      out?: boolean;
      date: number;
      peer_id?: { user_id?: string | number };
      action?: { duration?: number; reason?: { _: string } };
    }>;
    users?: Array<{ id: string | number; first_name?: string; last_name?: string }>;
  }>('messages.search', {
    peer: { _: 'inputPeerEmpty' },
    q: '',
    filter: { _: 'inputMessagesFilterPhoneCalls', missed: false },
    min_date: 0,
    max_date: 0,
    offset_id: 0,
    add_offset: 0,
    limit: 30,
    max_id: 0,
    min_id: 0,
    hash: 0,
  });

  const userMap = new Map((res.users ?? []).map((u) => [String(u.id), u]));
  return (res.messages ?? []).map((m) => {
    const uid = String(m.peer_id?.user_id ?? 0);
    const numId = Number(uid) || 0;
    const u = userMap.get(uid);
    const name = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || `User ${uid}`;
    const dur = m.action?.duration;
    const duration = typeof dur === 'number' && dur > 0
      ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`
      : null;
    return {
      id: m.id,
      peerId: numId,
      name,
      color: getAvatarColor(numId),
      type: m.out ? 'outgoing' : 'incoming',
      missed: m.action?.reason?._ === 'phoneCallDiscardReasonMissed',
      date: m.date,
      duration,
    };
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatBirthday(b?: { day?: number; month?: number; year?: number }): string {
  if (!b?.day || !b?.month) return '';
  const m = MONTHS[b.month - 1] ?? '';
  return b.year ? `${b.day} ${m} ${b.year}` : `${b.day} ${m}`;
}

export async function fetchRealProfile(id: string, accessHash = '0') {
  if (id === 'me') {
    const res = await call<{
      full_user?: { about?: string; birthday?: { day?: number; month?: number; year?: number } };
      users?: Array<{
        id: string | number;
        access_hash?: string | number;
        first_name?: string;
        last_name?: string;
        username?: string;
        phone?: string;
        status?: { _: string };
        photo?: { _: string; photo_id?: string | number };
      }>;
    }>('users.getFullUser', { id: { _: 'inputUserSelf' } });
    const u = res.users?.[0];
    const numId = Number(u?.id ?? 0) || 0;
    const name = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || 'Me';
    const photoId = u?.photo?._ === 'userProfilePhoto' && u.photo.photo_id ? String(u.photo.photo_id) : undefined;
    return {
      id: numId,
      accessHash: String(u?.access_hash ?? '0'),
      name,
      username: u?.username ? `@${u.username}` : '',
      phone: u?.phone ? `+${u.phone}` : '',
      bio: res.full_user?.about || '',
      birthday: formatBirthday(res.full_user?.birthday),
      online: u?.status?._ === 'userStatusOnline',
      color: getAvatarColor(numId),
      letters: getInitials(name) || 'ME',
      hasPhoto: Boolean(photoId),
      photoId,
    };
  }

  const res = await call<{
    full_user?: { about?: string; birthday?: { day?: number; month?: number; year?: number } };
    users?: Array<{
      id: string | number;
      access_hash?: string | number;
      first_name?: string;
      last_name?: string;
      username?: string;
      phone?: string;
      status?: { _: string };
      photo?: { _: string; photo_id?: string | number };
    }>;
  }>('users.getFullUser', { id: { _: 'inputUser', user_id: id, access_hash: accessHash } });
  const u = res.users?.[0];
  const numId = Number(id) || 0;
  const name = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || `User ${id}`;
  const photoId = u?.photo?._ === 'userProfilePhoto' && u.photo.photo_id ? String(u.photo.photo_id) : undefined;
  return {
    id: numId,
    accessHash: String(u?.access_hash ?? accessHash),
    name,
    username: u?.username ? `@${u.username}` : '',
    phone: u?.phone ? `+${u.phone}` : '',
    bio: res.full_user?.about || '',
    birthday: formatBirthday(res.full_user?.birthday),
    online: u?.status?._ === 'userStatusOnline',
    color: getAvatarColor(numId),
    letters: getInitials(name) || 'U',
    hasPhoto: Boolean(photoId),
    photoId,
  };
}

export type SharedFilterType = 'media' | 'files' | 'voice' | 'links';

export async function fetchSharedMedia(
  chatId: string,
  filterType: SharedFilterType,
  accessHash = '0',
  limit = 30,
  offsetId = 0
): Promise<RealMessageItem[]> {
  const filterMap: Record<SharedFilterType, { _: string }> = {
    media: { _: 'inputMessagesFilterPhotoVideo' },
    files: { _: 'inputMessagesFilterDocument' },
    voice: { _: 'inputMessagesFilterRoundVoice' },
    links: { _: 'inputMessagesFilterUrl' },
  };

  const res = await call<{
    messages?: Array<{
      id: number;
      message?: string;
      out?: boolean;
      date: number;
      media?: RawMedia;
      entities?: Array<{ _: string; offset: number; length: number; url?: string }>;
    }>;
  }>('messages.search', {
    peer: buildInputPeer(chatId, accessHash),
    q: '',
    filter: filterMap[filterType],
    min_date: 0,
    max_date: 0,
    offset_id: offsetId,
    add_offset: 0,
    limit,
    max_id: 0,
    min_id: 0,
    hash: 0,
  });

  return (res.messages ?? []).map((m) => ({
    id: m.id,
    text: m.message || '',
    out: Boolean(m.out),
    date: m.date,
    status: 'read' as const,
    media: parseMedia(m.media),
    entities: parseEntities(m.entities),
  }));
}

export interface CommonGroupItem {
  id: string;
  peerId: number;
  peerType: 'chat' | 'channel';
  accessHash: string;
  title: string;
  membersCount?: number;
  color: string;
  letters: string;
  hasPhoto: boolean;
  photoId?: string;
}

export async function fetchCommonGroups(userId: string, accessHash = '0', limit = 20): Promise<CommonGroupItem[]> {
  const hash = accessHash !== '0' ? accessHash : getPeerAccessHash(userId);
  const res = await call<{
    chats?: Array<{
      _: string;
      id: string | number;
      access_hash?: string | number;
      title?: string;
      participants_count?: number;
      photo?: { _: string; photo_id?: string | number };
    }>;
  }>('messages.getCommonChats', {
    user_id: { _: 'inputUser', user_id: userId, access_hash: hash },
    max_id: 0,
    limit,
  });

  return (res.chats ?? []).map((c) => {
    const numId = Number(c.id) || 0;
    const isChannel = c._ === 'channel' || c._ === 'channelForbidden';
    const photoId = c.photo?._ === 'chatPhoto' && c.photo.photo_id ? String(c.photo.photo_id) : undefined;
    const title = c.title || 'Group';
    return {
      id: `${isChannel ? 'c' : 'g'}_${numId}`,
      peerId: numId,
      peerType: isChannel ? 'channel' : 'chat',
      accessHash: String(c.access_hash ?? '0'),
      title,
      membersCount: c.participants_count,
      color: getAvatarColor(numId),
      letters: getInitials(title) || 'G',
      hasPhoto: Boolean(photoId),
      photoId,
    };
  });
}

export async function toggleMuteRealChat(chatId: string, mute: boolean, accessHash = '0') {
  return call('account.updateNotifySettings', {
    peer: { _: 'inputNotifyPeer', peer: buildInputPeer(chatId, accessHash) },
    settings: { _: 'inputPeerNotifySettings', mute_until: mute ? 2147483647 : 0 },
  });
}

export async function updateRealProfile(firstName: string, lastName = '', about = '') {
  return call('account.updateProfile', {
    first_name: firstName,
    last_name: lastName,
    about,
  });
}

export async function sendRealReaction(chatId: string, msgId: number, emoticon: string, accessHash = '0') {
  // Telegram MTProto rejects variation selector-16 (\uFE0F), e.g. '❤️' -> '❤' (REACTION_INVALID)
  const cleanEmoticon = emoticon ? emoticon.replace(/\uFE0F/g, '') : '';
  return call('messages.sendReaction', {
    peer: buildInputPeer(chatId, accessHash),
    msg_id: msgId,
    reaction: cleanEmoticon ? [{ _: 'reactionEmoji', emoticon: cleanEmoticon }] : [],
  });
}

export async function forwardRealMessages(
  fromChatId: string,
  toChatId: string,
  msgIds: number[],
  fromAccessHash = '0',
  toAccessHash = '0'
) {
  return call('messages.forwardMessages', {
    from_peer: buildInputPeer(fromChatId, fromAccessHash),
    to_peer: buildInputPeer(toChatId, toAccessHash),
    id: msgIds,
    random_id: msgIds.map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
  });
}

export async function importRealContact(phone: string, firstName: string, lastName = '') {
  return call('contacts.importContacts', {
    contacts: [{ _: 'inputPhoneContact', client_id: Date.now(), phone, first_name: firstName, last_name: lastName }],
  });
}

export async function uploadAndSendMedia(chatId: string, file: File, accessHash = '0') {
  const fileId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  const chunkSize = 512 * 1024;
  const parts = Math.max(1, Math.ceil(file.size / chunkSize));

  for (let i = 0; i < parts; i++) {
    const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
    const bytes = new Uint8Array(await chunk.arrayBuffer());
    await call('upload.saveFilePart', { file_id: fileId, file_part: i, bytes });
  }

  const inputFile = { _: 'inputFile', id: fileId, parts, name: file.name, md5_checksum: '' };
  const isImage = file.type.startsWith('image/');
  const isVoice = file.name.startsWith('voice-') || file.type.startsWith('audio/');
  const docAttributes: Array<Record<string, unknown>> = [
    { _: 'documentAttributeFilename', file_name: file.name },
  ];
  if (isVoice) {
    docAttributes.push({
      _: 'documentAttributeAudio',
      voice: file.name.startsWith('voice-'),
      duration: 0,
    });
  }
  const media = isImage
    ? { _: 'inputMediaUploadedPhoto', file: inputFile }
    : {
        _: 'inputMediaUploadedDocument',
        file: inputFile,
        mime_type: file.type || 'application/octet-stream',
        attributes: docAttributes,
      };

  return call('messages.sendMedia', {
    peer: buildInputPeer(chatId, accessHash),
    media,
    message: '',
    random_id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  });
}
