'use client';
import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowDown, Bell, BellOff, Copy, Forward, Pin, Share2, Trash2, User, X } from 'lucide-react';
import { Avatar }        from '@/components/ui/Avatar';
import { BubbleGroup }   from '@/components/ui/bubble';
import { BottomSheet }   from '@/components/ui/BottomSheet';
import { toast }         from '@/components/ui/Toast';
import { MediaViewer }   from '@/features/media/MediaViewer';
import { LocationPreviewModal, type LocationPreviewData } from '@/components/ui/LocationPreviewModal';
import { MessageSkeletonList } from '@/components/ui/Skeleton';
import { ChatWallpaperLayer } from '@/components/ui/ChatWallpaperLayer';
import { MessageBubble } from './MessageBubble';
import { MessageInput }  from './MessageInput';
import { useAuthStore } from '@/store/auth.store';
import { useDialogsStore, getAvatarColor, getInitials } from '@/store/dialogs.store';
import { useUIStore }    from '@/store/ui.store';
import {
  deleteRealMessages,
  editRealMessage,
  fetchChatPermissions,
  fetchPeerReadOutboxMaxId,
  fetchPinnedMessage,
  fetchRealHistory,
  forwardRealMessages,
  isMTProtoConfigured,
  markHistoryRead,
  parseMedia,
  pinRealMessage,
  sendRealContact,
  sendRealGeo,
  sendRealPoll,
  sendRealReaction,
  sendRealSticker,
  sendRealTextMessage,
  sendTyping,
  toUint8Array,
  uploadAndSendMedia,
  type RawMedia,
  type RealContactItem,
  type RealMessageItem,
  type StickerItem,
} from '@/services/telegram.real';
import type { ChatPermissions } from '@/store/dialogs.store';
import { onMTProtoUpdate } from '@/core/telegram/mtproto.client';
import { getDraft, saveDraft, getCachedMessages, setCachedMessages, conversationMessagesCache } from '@/core/storage/messages';
export { getCachedMessages, setCachedMessages, conversationMessagesCache };
import { format, isToday, isYesterday } from 'date-fns';

type Msg = RealMessageItem;

function dateSeparator(date?: number): string {
  if (!date || isNaN(date) || typeof date !== 'number' || date <= 0) {
    return 'Today';
  }
  try {
    const d = new Date(date * 1000);
    if (isNaN(d.getTime())) return 'Today';
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d, yyyy');
  } catch {
    return 'Today';
  }
}

function mergeAlbumMessages(msgs: Msg[]): Msg[] {
  if (!Array.isArray(msgs) || msgs.length === 0) return [];
  const result: Msg[] = [];
  for (const raw of msgs) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'number') continue;
    const m = { ...raw };
    const prev = result.at(-1);
    if (
      m.groupedId &&
      prev &&
      prev.groupedId === m.groupedId &&
      prev.out === m.out &&
      m.media &&
      (m.media.kind === 'photo' || m.media.kind === 'video') &&
      (prev.albumMedia?.length || (prev.media && (prev.media.kind === 'photo' || prev.media.kind === 'video')))
    ) {
      const existingItems = prev.albumMedia ? [...prev.albumMedia] : (prev.media ? [{ id: prev.id, media: prev.media }] : []);
      if (!existingItems.some((item) => item.id === m.id)) {
        prev.albumMedia = [...existingItems, { id: m.id, media: m.media }];
      }
      if (!prev.text && m.text) prev.text = m.text;
      if (!prev.entities && m.entities) prev.entities = m.entities;
      if (!prev.reactions && m.reactions) prev.reactions = m.reactions;
      prev.status = m.status;
    } else {
      result.push(m);
    }
  }
  return result;
}

function groupByDateAndSender(msgs: Msg[]) {
  if (!Array.isArray(msgs) || msgs.length === 0) return [];
  const merged = mergeAlbumMessages(msgs);
  const dateGroups: { label: string; runs: { out: boolean; senderId?: number; messages: Msg[] }[] }[] = [];
  let currentLabel = '';
  for (const m of merged) {
    if (!m || typeof m !== 'object') continue;
    const label = dateSeparator(m.date);
    if (label !== currentLabel) {
      currentLabel = label;
      dateGroups.push({ label, runs: [] });
    }
    const currentGroup = dateGroups.at(-1);
    if (!currentGroup) continue;
    const runs = currentGroup.runs;
    const lastRun = runs.at(-1);
    if (lastRun && lastRun.out === m.out && (m.out || lastRun.senderId === m.sender?.peerId)) {
      lastRun.messages.push(m);
    } else {
      runs.push({ out: Boolean(m.out), senderId: m.sender?.peerId, messages: [m] });
    }
  }
  return dateGroups;
}

function describeTypingAction(action?: { _?: string }): string | null {
  switch (action?._) {
    case 'sendMessageCancelAction':
      return null;
    case 'sendMessageRecordAudioAction':
      return 'recording voice';
    case 'sendMessageUploadAudioAction':
      return 'sending audio';
    case 'sendMessageRecordVideoAction':
      return 'recording video';
    case 'sendMessageUploadVideoAction':
      return 'sending video';
    case 'sendMessageUploadPhotoAction':
      return 'sending photo';
    case 'sendMessageUploadDocumentAction':
      return 'sending file';
    case 'sendMessageRecordRoundAction':
    case 'sendMessageUploadRoundAction':
      return 'recording video message';
    case 'sendMessageChooseStickerAction':
      return 'choosing a sticker';
    case 'sendMessageGeoLocationAction':
      return 'choosing location';
    case 'sendMessageGamePlayAction':
      return 'playing a game';
    case 'sendMessageTypingAction':
    default:
      return 'typing';
  }
}


export default function ConversationScreen() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const myUserId = useAuthStore((s) => s.userId);
  const { dialogs, updateUnread, updateLastMessage } = useDialogsStore();
  const { setActiveCall, startAiCall, chatWallpaper, chatWallpaperImage, chatWallpaperDim, chatWallpaperBlur } = useUIStore();

  const chatMeta = useMemo(() => {
    const found = dialogs.find((d) => d.id === id);
    if (found) {
      const isSaved = Boolean(found.isSavedMessages || (myUserId && found.peerId === myUserId));
      return isSaved
        ? { ...found, title: 'Saved Messages', isOnline: false, isSavedMessages: true }
        : found;
    }
    const rawNum = parseInt((id || '').split('_')[1] || '0', 10);
    const isSaved = Boolean(myUserId && rawNum === myUserId && id?.startsWith('u_'));
    return {
      id: id || 'u_0',
      title: isSaved ? 'Saved Messages' : `Chat ${id}`,
      avatarLetters: isSaved ? 'SM' : getInitials(`Chat ${id}`),
      avatarColor: isSaved ? '#2AABEE' : getAvatarColor(rawNum),
      isOnline: false,
      isMuted: false,
      peerType: 'user' as const,
      peerId: rawNum,
      accessHash: '0',
      readOutboxMaxId: 0,
      hasPhoto: false,
      photoId: undefined,
      isSavedMessages: isSaved,
    };
  }, [dialogs, id, myUserId]);

  const [messages, setMessages] = useState<Msg[]>(() => (id ? getCachedMessages(id) : []));
  const messagesRef = useRef<Msg[]>(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    if (id && messages.length > 0) {
      setCachedMessages(id, messages);
    }
  }, [id, messages]);
  const [loading, setLoading] = useState(() => Boolean(id && getCachedMessages(id).length === 0));
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [initialDraft, setInitialDraft] = useState('');
  const [pinnedMsg, setPinnedMsg] = useState<Msg | null>(null);
  const [partnerAction, setPartnerAction] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [replyTo,  setReplyTo]  = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [forwardMsgIds, setForwardMsgIds] = useState<number[] | null>(null);
  const [deleteTargetIds, setDeleteTargetIds] = useState<number[] | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [mediaViewer, setMediaViewer] = useState<{
    src: string;
    type: 'image' | 'video';
    senderName?: string;
    date?: number;
    caption?: string;
    onForward?: () => void;
    onReply?: () => void;
    onDelete?: () => void;
    isOut?: boolean;
  } | null>(null);
  const [locationPreview, setLocationPreview] = useState<LocationPreviewData | null>(null);
  const [searchOpen, setSearchOpen] = useState(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('search') === '1'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [muted, setMuted] = useState(chatMeta.isMuted);
  const [chatPermissions, setChatPermissions] = useState<ChatPermissions | null>(
    () => ('permissions' in chatMeta ? chatMeta.permissions ?? null : null)
  );
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accessHash = chatMeta.accessHash ?? '0';
  // Keep accessHash stable in a ref so the load effect only re-runs when id changes
  const accessHashRef = useRef(accessHash);
  accessHashRef.current = accessHash;
  const initialScrolledRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const hasMoreOlderRef = useRef(true);
  const anchorRef = useRef<{ id: number; top: number } | null>(null);
  const PAGE_SIZE = 30;

  // Load / refresh permissions for group and channel chats
  useEffect(() => {
    if (!id || !isMTProtoConfigured()) return;
    let cancelled = false;

    // Seed immediately from dialog meta if available (avoids flicker)
    const metaPerms = 'permissions' in chatMeta ? chatMeta.permissions : undefined;
    if (metaPerms) {
      setChatPermissions(metaPerms);
    }
    // Then fetch fresh from API (groups / channels only)
    if (id.startsWith('c_') || id.startsWith('g_')) {
      fetchChatPermissions(id, accessHashRef.current).then((p) => {
        if (!cancelled && p) setChatPermissions(p);
      }).catch(() => {});
    } else {
      // DMs are always fully open
      setChatPermissions({
        isBroadcast: false, isMegagroup: false, isCreator: false, isAdmin: false, isLeft: false,
        canSendMessages: true, canSendMedia: true, canSendStickers: true, canSendPolls: true,
        canPinMessages: false, canChangeInfo: false, canInviteUsers: false,
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'instant') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getDraft(id).then((d) => {
      if (!cancelled) setInitialDraft(d);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!isMTProtoConfigured() || !id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    initialScrolledRef.current = false;

    // Fast memory + localStorage cache (stale-while-revalidate): display immediately if already loaded
    const cached = getCachedMessages(id);
    if (cached.length > 0) {
      setMessages(cached);
      setLoading(false);
    } else {
      setLoading(true);
      setMessages([]);
    }

    // Always use the ref so a late-loading accessHash doesn't re-trigger this effect
    const hash = accessHashRef.current && accessHashRef.current !== '0'
      ? accessHashRef.current
      : '0';

    // Fetch latest 30 messages first for fast initial render (older messages load on scroll up)
    fetchRealHistory(id, hash, PAGE_SIZE, 0)
      .then((real) => {
        if (cancelled) return;
        setCachedMessages(id, real);
        setMessages(real);
        setHasMoreOlder(real.length >= PAGE_SIZE);
        const latestId = real.at(-1)?.id;
        if (latestId) {
          markHistoryRead(id, latestId, hash).catch(() => {});
          updateUnread(id, 0);
        }

        // Silent background sync for fresh outbox max id without blocking message display
        fetchPeerReadOutboxMaxId(id, hash).then((freshOutbox) => {
          if (cancelled || !freshOutbox) return;
          setMessages((prev) => {
            const updated = prev.map((m) =>
              m.out && m.id <= freshOutbox ? { ...m, status: 'read' as const } : m
            );
            conversationMessagesCache.set(id, updated);
            return updated;
          });
        }).catch(() => {});
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err = e as { error_message?: string; message?: string };
        toast(err?.error_message || err?.message || 'Failed to load messages', 'error');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    fetchPinnedMessage(id, hash).then((pm) => {
      if (!cancelled) setPinnedMsg(pm);
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
    // Only re-run when the chat id changes — accessHash is read from ref to avoid double-fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, updateUnread]);

  // Scroll to the bottom synchronously before paint on initial load to avoid top-to-bottom flicker
  useLayoutEffect(() => {
    if (loading || messages.length === 0 || initialScrolledRef.current) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    initialScrolledRef.current = true;
  }, [loading, messages.length]);

  const loadOlderMessages = useCallback(async () => {
    if (!isMTProtoConfigured() || !id || loadingOlderRef.current || !hasMoreOlderRef.current || messagesRef.current.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;

    const oldestId = messagesRef.current[0].id;
    const hash = accessHashRef.current && accessHashRef.current !== '0' ? accessHashRef.current : '0';

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const older = await fetchRealHistory(id, hash, PAGE_SIZE, 0, oldestId);
      const existingIds = new Set(messagesRef.current.map((m) => m.id));
      const newOlder = older.filter((m) => !existingIds.has(m.id));

      if (older.length < PAGE_SIZE || newOlder.length === 0) {
        hasMoreOlderRef.current = false;
        setHasMoreOlder(false);
      }

      if (newOlder.length > 0) {
        // Record scroll anchor before prepending DOM elements
        const anchorEl = document.getElementById(`msg-${oldestId}`);
        if (anchorEl) {
          anchorRef.current = {
            id: oldestId,
            top: anchorEl.getBoundingClientRect().top,
          };
        }

        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const toPrepend = older.filter((m) => !existing.has(m.id));
          if (toPrepend.length === 0) return prev;
          const updated = [...toPrepend, ...prev].sort((a, b) => a.id - b.id);
          conversationMessagesCache.set(id, updated);
          return updated;
        });
      }
    } catch {
      // ignore network errors during older message load
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [id]);

  // Seamless scroll anchoring: maintain exact visible position when older messages are prepended
  useLayoutEffect(() => {
    if (!anchorRef.current || !scrollRef.current) return;
    const { id: anchorId, top: prevTop } = anchorRef.current;
    anchorRef.current = null;

    const anchorEl = document.getElementById(`msg-${anchorId}`);
    if (anchorEl && scrollRef.current) {
      const currentTop = anchorEl.getBoundingClientRect().top;
      const delta = currentTop - prevTop;
      if (Math.abs(delta) > 0.5) {
        scrollRef.current.scrollTop += delta;
      }
    }
  }, [messages]);

  // If initial batch doesn't fill the screen, load older messages automatically
  useEffect(() => {
    if (loading || loadingOlder || !hasMoreOlder || messages.length === 0) return;
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 100) {
      loadOlderMessages();
    }
  }, [loading, loadingOlder, hasMoreOlder, messages.length, loadOlderMessages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distFromBottom > 240);

    // Only allow older message loading AFTER initial scroll to bottom has completed!
    if (initialScrolledRef.current && el.scrollTop < 120 && hasMoreOlder && !loadingOlderRef.current) {
      loadOlderMessages();
    }
  };

  useEffect(() => {
    if (!partnerAction) return;
    const el = scrollRef.current;
    const nearBottom = !el || (el.scrollHeight - el.scrollTop - el.clientHeight < 220);
    if (nearBottom) {
      scrollToBottom('smooth');
    }
  }, [partnerAction, scrollToBottom]);

  // Real-time incoming messages, typing indicators & outbox read receipts
  useEffect(() => {
    if (!isMTProtoConfigured() || !id) return;
    let unsub: (() => void) | undefined;
    try {
      unsub = onMTProtoUpdate((ev) => {
        const updates = ev.updates ?? (ev.update ? [ev.update] : []);
        for (const u of updates as Array<{
          _: string;
          user_id?: string | number;
          chat_id?: string | number;
          channel_id?: string | number;
          action?: { _?: string };
          max_id?: number;
          peer?: { user_id?: string | number; chat_id?: string | number; channel_id?: string | number };
          message?: {
            id: number;
            message?: string;
            date: number;
            out?: boolean;
            grouped_id?: string | number;
            media?: RawMedia;
            peer_id?: { user_id?: string | number; chat_id?: string | number; channel_id?: string | number };
          };
        }>) {
          if ((u._ === 'updateNewMessage' || u._ === 'updateNewChannelMessage') && u.message) {
            const p = u.message.peer_id;
            const peerKey = p?.user_id ? `u_${p.user_id}` : p?.channel_id ? `c_${p.channel_id}` : p?.chat_id ? `g_${p.chat_id}` : '';
            const isSelfChat = Boolean(chatMeta.isSavedMessages || (myUserId && id === `u_${myUserId}`) || id === 'me');
            const matchesChat = peerKey === id || (isSelfChat && p?.user_id && String(p.user_id) === String(myUserId));
            if (matchesChat) {
              setPartnerAction(null);
              const media = parseMedia(u.message.media);
              const safeUpdateDate = (typeof u.message.date === 'number' && !isNaN(u.message.date) && u.message.date > 0)
                ? u.message.date
                : Math.floor(Date.now() / 1000);
              setMessages((prev) =>
                prev.some((m) => m.id === u.message!.id)
                  ? prev
                  : [
                      ...prev,
                      {
                        id: u.message!.id,
                        text: u.message!.message || '',
                        out: Boolean(u.message!.out),
                        date: safeUpdateDate,
                        status: 'read',
                        media,
                        groupedId: u.message!.grouped_id ? String(u.message!.grouped_id) : undefined,
                      },
                    ]
              );
              if (!u.message.out) {
                markHistoryRead(id, u.message.id, accessHash).catch(() => {});
                if (typeof document !== 'undefined' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification(chatMeta.title, { body: u.message.message || 'New message' });
                }
              }
              setTimeout(() => scrollToBottom('smooth'), 50);
            }
          }
          if (u._ === 'updateEditMessage' && u.message) {
            setMessages((prev) =>
              prev.map((m) => (m.id === u.message!.id ? { ...m, text: u.message!.message || m.text, edited: true } : m))
            );
          }
          if (
            (u._ === 'updateUserTyping' && id === `u_${u.user_id}`) ||
            (u._ === 'updateChatUserTyping' && id === `g_${u.chat_id}`) ||
            (u._ === 'updateChannelUserTyping' && id === `c_${u.channel_id}`)
          ) {
            const label = describeTypingAction(u.action);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            setPartnerAction(label);
            if (label) {
              typingTimerRef.current = setTimeout(() => setPartnerAction(null), 5000);
            }
          }
          if (u._ === 'updateReadHistoryOutbox' && u.max_id && u.peer) {
            const p = u.peer;
            const peerKey = p.user_id ? `u_${p.user_id}` : p.channel_id ? `c_${p.channel_id}` : p.chat_id ? `g_${p.chat_id}` : '';
            if (peerKey === id) {
              const maxRead = u.max_id;
              setMessages((prev) => prev.map((m) => (m.out && m.id <= maxRead ? { ...m, status: 'read' } : m)));
            }
          }
        }
      });
    } catch {
      // ignore
    }
    return () => {
      unsub?.();
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [id, accessHash, chatMeta.title]);

  // ── Periodic poll: fetch newest messages every 8 s when the tab is visible ──
  useEffect(() => {
    if (!isMTProtoConfigured() || !id) return;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || document.hidden) return;
      const hash = accessHashRef.current && accessHashRef.current !== '0' ? accessHashRef.current : '0';
      try {
        const fresh = await fetchRealHistory(id, hash, 20, 0);
        if (cancelled || fresh.length === 0) return;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newOnes = fresh.filter((m) => !existingIds.has(m.id));
          if (newOnes.length === 0) return prev;
          const merged = [...prev, ...newOnes].sort((a, b) => a.id - b.id);
          conversationMessagesCache.set(id, merged);
          return merged;
        });
      } catch {
        // silent – don't disrupt UX
      }
    };

    const iv = setInterval(poll, 8_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const visibleMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => m.text.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const groups = useMemo(() => groupByDateAndSender(visibleMessages), [visibleMessages]);

  const handleSend = async (text: string) => {
    if (editingId) {
      const targetId = editingId;
      setEditingId(null);
      setMessages((prev) => prev.map((m) => (m.id === targetId ? { ...m, text, edited: true } : m)));
      if (isMTProtoConfigured() && id) {
        try {
          await editRealMessage(id, targetId, text, accessHash);
          toast('Message updated', 'success');
        } catch (e: unknown) {
          const err = e as { error_message?: string; message?: string };
          toast(err?.error_message || err?.message || 'Edit failed', 'error');
        }
      }
      return;
    }

    const msg: Msg = {
      id: Date.now(),
      text,
      out: true,
      date: Date.now() / 1000,
      status: 'sending',
      ...(replyTo ? { replyTo } : {}),
    };
    setMessages(m => [...m, msg]);
    const currentReply = replyTo ?? undefined;
    setReplyTo(null);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    if (!isMTProtoConfigured() || !id) {
      toast('Configure MTProto API keys in .env.local to send messages', 'error');
      return;
    }

    try {
      const serverMsgId = await sendRealTextMessage(id, text, accessHash, currentReply);
      setMessages(m => m.map(x => x.id === msg.id ? { ...x, id: serverMsgId ?? x.id, status: 'sent' } : x));
      updateLastMessage(id, text, Math.floor(Date.now() / 1000), true, false);
    } catch (e: unknown) {
      const err = e as { error_message?: string; message?: string };
      toast(err?.error_message || err?.message || 'Failed to send message', 'error');
    }
  };

  const handleSendFiles = async (files: FileList) => {
    if (!isMTProtoConfigured() || !id) return;
    for (const file of Array.from(files)) {
      const tempId = Date.now() + Math.random();
      const localUrl = URL.createObjectURL(file);
      const isVoice = file.name.startsWith('voice-') || file.type.startsWith('audio/');
      const isPhoto = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const kind = isVoice ? 'voice' : isPhoto ? 'photo' : isVideo ? 'video' : 'document';
      sendTyping(
        id,
        accessHash,
        isPhoto
          ? 'sendMessageUploadPhotoAction'
          : isVideo
          ? 'sendMessageUploadVideoAction'
          : isVoice
          ? 'sendMessageUploadAudioAction'
          : 'sendMessageUploadDocumentAction'
      ).catch(() => {});
      setMessages(m => [
        ...m,
        {
          id: tempId,
          text: '',
          out: true,
          date: Date.now() / 1000,
          status: 'sending',
          media: {
            kind,
            id: String(tempId),
            accessHash: '0',
            mimeType: file.type,
            fileName: file.name,
            size: file.size,
            localUrl,
          },
        },
      ]);
      try {
        await uploadAndSendMedia(id, file, accessHash);
        setMessages(m => m.map(x => x.id === tempId ? { ...x, status: 'sent' } : x));
        const label = isVoice ? 'Voice message' : isPhoto ? 'Photo' : isVideo ? 'Video' : file.name;
        updateLastMessage(id, label, Math.floor(Date.now() / 1000), true, false, {
          kind,
          id: String(tempId),
          accessHash: '0',
          mimeType: file.type,
          fileName: file.name,
        });
      } catch (e: unknown) {
        const err = e as { error_message?: string; message?: string };
        toast(err?.error_message || err?.message || `Failed to send ${file.name}`, 'error');
      }
    }
  };

  const handleSendSticker = async (s: StickerItem) => {
    if (!isMTProtoConfigured() || !id) return;
    const tempId = Date.now();
    const isGif = s.mimeType === 'video/mp4';
    setMessages((m) => [
      ...m,
      {
        id: tempId,
        text: '',
        out: true,
        date: Date.now() / 1000,
        status: 'sending',
        media: {
          kind: isGif ? 'video' : 'sticker',
          id: s.id,
          accessHash: s.accessHash,
          fileReference: s.fileReference,
          dcId: s.dcId,
          mimeType: s.mimeType,
          thumbSize: s.thumbSize,
          fileName: `Sticker ${s.alt}`,
        },
      },
    ]);
    setTimeout(() => scrollToBottom('smooth'), 50);
    try {
      await sendRealSticker(id, s, accessHash);
      setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, status: 'sent' } : x)));
    } catch {
      toast('Failed to send sticker', 'error');
    }
  };

  const handleSendLocation = async (lat: number, long: number) => {
    if (!isMTProtoConfigured() || !id) return;
    const tempId = Date.now();
    setMessages((m) => [
      ...m,
      {
        id: tempId,
        text: '',
        out: true,
        date: Date.now() / 1000,
        status: 'sending',
        media: { kind: 'geo', id: 'geo', accessHash: '0', lat, long },
      },
    ]);
    setTimeout(() => scrollToBottom('smooth'), 50);
    try {
      await sendRealGeo(id, lat, long, accessHash);
      setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, status: 'sent' } : x)));
    } catch {
      toast('Failed to send location', 'error');
    }
  };

  const handleSendContact = async (c: RealContactItem) => {
    if (!isMTProtoConfigured() || !id) return;
    const tempId = Date.now();
    setMessages((m) => [
      ...m,
      {
        id: tempId,
        text: '',
        out: true,
        date: Date.now() / 1000,
        status: 'sending',
        media: { kind: 'contact', id: 'contact', accessHash: '0', contactName: c.name, contactPhone: c.phone },
      },
    ]);
    setTimeout(() => scrollToBottom('smooth'), 50);
    try {
      await sendRealContact(id, c.phone.replace(/\+/g, ''), c.name, '', accessHash);
      setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, status: 'sent' } : x)));
    } catch {
      toast('Failed to share contact', 'error');
    }
  };

  const handleSendPoll = async (question: string, options: string[]) => {
    if (!isMTProtoConfigured() || !id) return;
    const tempId = Date.now();
    setMessages((m) => [
      ...m,
      {
        id: tempId,
        text: '',
        out: true,
        date: Date.now() / 1000,
        status: 'sending',
        media: { kind: 'poll', id: 'poll', accessHash: '0', pollQuestion: question, pollOptions: options },
      },
    ]);
    setTimeout(() => scrollToBottom('smooth'), 50);
    try {
      await sendRealPoll(id, question, options, accessHash);
      setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, status: 'sent' } : x)));
    } catch {
      toast('Failed to create poll', 'error');
    }
  };

  const handlePin = async (msgId: number) => {
    const target = messages.find((m) => m.id === msgId);
    if (target) setPinnedMsg(target);
    if (isMTProtoConfigured() && id) {
      try {
        await pinRealMessage(id, msgId, false, accessHash);
        toast('Message pinned', 'success');
      } catch {
        toast('Could not pin message', 'error');
      }
    }
  };

  const handleDeleteConfirm = async (revoke: boolean) => {
    if (!deleteTargetIds?.length) return;
    const ids = deleteTargetIds;
    setDeleteTargetIds(null);
    setSelectMode(false);
    setSelectedIds([]);
    setMessages(m => m.filter(x => !ids.includes(x.id)));
    if (revoke && isMTProtoConfigured()) {
      deleteRealMessages(ids).catch(() => {});
    }
    toast(revoke ? 'Deleted for everyone' : 'Deleted for you', 'success');
  };

  const toggleSelect = (msgId: number) => {
    setSelectedIds((prev) => (prev.includes(msgId) ? prev.filter((x) => x !== msgId) : [...prev, msgId]));
  };

  const handleReact = (msgId: number, emoji: string, remove = false) => {
    const normalized = emoji.replace(/\uFE0F/g, '');
    const prevSnapshot = messages.find((m) => m.id === msgId)?.reactions;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const curr = m.reactions ?? [];
        const existing = curr.find((r) => r.emoji.replace(/\uFE0F/g, '') === normalized);
        const next = remove
          ? curr
              .map((r) => (r.emoji.replace(/\uFE0F/g, '') === normalized ? { ...r, count: r.count - 1, chosen: false } : r))
              .filter((r) => r.count > 0)
          : existing
          ? curr.map((r) => (r.emoji.replace(/\uFE0F/g, '') === normalized ? { ...r, count: r.count + 1, chosen: true } : r))
          : [...curr, { emoji: normalized, count: 1, chosen: true }];
        return { ...m, reactions: next };
      })
    );
    if (isMTProtoConfigured() && id) {
      sendRealReaction(id, msgId, remove ? '' : normalized, accessHash).catch((e: unknown) => {
        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, reactions: prevSnapshot } : m)));
        const err = e as { error_message?: string; message?: string };
        toast(err?.error_message || err?.message || 'Failed to update reaction', 'error');
      });
    }
  };

  const handleForwardTo = async (targetChatId: string, targetAccessHash = '0') => {
    if (!forwardMsgIds?.length || !id) return;
    const idsToForward = forwardMsgIds;
    setForwardMsgIds(null);
    setSelectMode(false);
    setSelectedIds([]);
    if (!isMTProtoConfigured()) return;
    try {
      await forwardRealMessages(id, targetChatId, idsToForward, accessHash, targetAccessHash);
      toast(idsToForward.length > 1 ? `Forwarded ${idsToForward.length} messages` : 'Message forwarded', 'success');
    } catch (e: unknown) {
      const err = e as { error_message?: string; message?: string };
      toast(err?.error_message || err?.message || 'Forward failed', 'error');
    }
  };

  const replyMsg = replyTo ? messages.find(m => m.id === replyTo) : null;
  const editMsg  = editingId ? messages.find(m => m.id === editingId) : null;

  return (
    <div className="flex flex-col h-full bg-tg-bg-tertiary relative">
      {/* Header */}
      {selectMode ? (
        <div className="flex items-center justify-between px-4 pb-3 pt-2 bg-tg-bg safe-top border-b border-tg-border/20 [data-theme='manga']_&:border-b-0 shrink-0">
          <button
            onClick={() => { setMessages([]); setSelectMode(false); setSelectedIds([]); }}
            className="text-rose-500 text-sm font-medium"
          >
            Clear Chat
          </button>
          <span className="text-tg-text font-semibold text-sm">{selectedIds.length} Selected</span>
          <button
            onClick={() => { setSelectMode(false); setSelectedIds([]); }}
            className="text-tg-blue text-sm font-semibold"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 pb-2.5 pt-2 bg-tg-bg/85 backdrop-blur-2xl safe-top border-b border-tg-border/15 [data-theme='manga']_&:border-b-0 shrink-0">
        <button
          onClick={() => router.push('/dialogs')}
          className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-tg-blue active:scale-95 transition-transform shrink-0"
          aria-label="Back"
        >
          <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        <button className="flex items-center gap-2.5 flex-1 min-w-0 text-left" onClick={() => router.push(`/profile/${chatMeta.isSavedMessages ? 'me' : chatMeta.peerId}`)}>
          <Avatar
            chatId={chatMeta.id}
            letters={chatMeta.avatarLetters}
            color={chatMeta.avatarColor}
            size="sm"
            online={chatMeta.isOnline}
            isSavedMessages={chatMeta.isSavedMessages}
            peerType={chatMeta.peerType}
            peerId={chatMeta.peerId}
            accessHash={accessHash}
            hasPhoto={chatMeta.hasPhoto}
            photoId={chatMeta.photoId}
            dcId={chatMeta.dcId}
          />
          <div className="text-left min-w-0">
            <p className="text-tg-text font-semibold text-[16px] leading-normal truncate py-0.5">{chatMeta.title}</p>
            <p className={`text-[12px] font-normal leading-normal ${partnerAction || chatMeta.isOnline ? 'text-emerald-400' : 'text-tg-text-hint'}`}>
              {partnerAction
                ? `• ${partnerAction}…`
                : chatMeta.isSavedMessages
                ? '• Cloud Storage'
                : chatMeta.isOnline
                ? '• Online'
                : chatMeta.peerType === 'channel'
                ? '• Channel'
                : chatMeta.peerType === 'chat'
                ? '• Group'
                : '• Offline'}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => { setSearchOpen((v) => !v); setSearchQuery(''); }}
            className="w-8.5 h-8.5 w-[34px] h-[34px] rounded-full bg-tg-surface/70 border border-tg-border/20 flex items-center justify-center text-tg-text-secondary active:opacity-60 transition-opacity"
            aria-label="Search chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
          </button>
          <button
            onClick={() => startAiCall()}
            className="w-[34px] h-[34px] rounded-full bg-tg-surface/70 border border-tg-border/20 flex items-center justify-center active:opacity-60 transition-opacity"
            aria-label="AI Voice Call"
            title="AI Voice Call"
          >
            <img src="/icons/ai-brain.png" alt="AI" className="w-5 h-5 object-contain" />
          </button>
          <button
            onClick={() => setActiveCall(chatMeta.peerId, chatMeta.title)}
            className="w-[34px] h-[34px] rounded-full bg-tg-surface/70 border border-tg-border/20 flex items-center justify-center text-tg-text-secondary active:opacity-60 transition-opacity"
            aria-label="Voice Call"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498A1 1 0 0121 17.72V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
          </button>
          <button
            onClick={() => setMenuOpen(true)}
            className="w-[34px] h-[34px] rounded-full bg-tg-surface/70 border border-tg-border/20 flex items-center justify-center text-tg-text-secondary active:opacity-60 transition-opacity"
            aria-label="More options"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5"  r="1.3" fill="currentColor"/>
              <circle cx="12" cy="12" r="1.3" fill="currentColor"/>
              <circle cx="12" cy="19" r="1.3" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
      )}

      {/* Pinned Message Banner */}
      {pinnedMsg && (
        <div className="px-3 py-2 bg-tg-bg-secondary border-b border-tg-border/35 flex items-center gap-2.5 shrink-0">
          <Pin className="w-4 h-4 text-tg-blue shrink-0" />
          <button
            onClick={() => document.getElementById(`msg-${pinnedMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="flex-1 text-left min-w-0"
          >
            <p className="text-tg-blue text-[11px] font-semibold">Pinned Message</p>
            <p className="text-tg-text-secondary text-xs truncate">{pinnedMsg.text}</p>
          </button>
          <button
            onClick={() => {
              const pid = pinnedMsg.id;
              setPinnedMsg(null);
              if (isMTProtoConfigured() && id) pinRealMessage(id, pid, true, accessHash).catch(() => {});
            }}
            className="text-tg-text-hint p-1"
            aria-label="Unpin"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {searchOpen && (
        <div className="px-3 py-2 bg-tg-bg border-b border-tg-border/35 flex items-center gap-2 shrink-0">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in conversation..."
            className="flex-1 bg-tg-surface rounded-xl px-3 py-2 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none"
          />
          <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-tg-blue text-xs font-medium px-2">
            Done
          </button>
        </div>
      )}

      {/* Messages with Chat Wallpaper */}
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
        <ChatWallpaperLayer
          wallpaper={chatWallpaper}
          customImage={chatWallpaperImage}
          dim={chatWallpaperDim}
          blur={chatWallpaperBlur}
        />
        <div ref={scrollRef} onScroll={handleScroll} className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-3 pt-2 pb-4">
        {/* Inner flex-col with mt-auto so messages anchor to bottom when few messages exist, without flex-end scroll clipping */}
        <div className="min-h-full flex flex-col">
        <div className="mt-auto" />
        {loading && messages.length === 0 && (
          <MessageSkeletonList />
        )}
        {loadingOlder && (
          <p className="text-tg-text-hint text-xs text-center py-2">Loading older messages…</p>
        )}
        {!loading && groups.length === 0 && (
          <p className="text-tg-text-hint text-sm text-center mt-12">No messages yet</p>
        )}
        {groups.map((group, gIdx) => (
          <div key={`group-${gIdx}-${group.label}`}>
            <div className="flex items-center justify-center my-3">
              <span data-date-divider="true" className="bg-tg-bg-secondary/90 border border-tg-border/35 shadow-sm text-tg-text-hint text-xs px-3 py-1 rounded-full">
                {group.label}
              </span>
            </div>
            {group.runs.map((run, rIdx) => (
              <BubbleGroup key={`run-${rIdx}`} align={run.out ? 'end' : 'start'}>
                {run.messages.map((msg, mIdx) => (
                  <MessageBubble
                    key={`msg-${msg.id}-${mIdx}`}
                    message={msg}
                    replyPreviewText={msg.replyTo ? messages.find((x) => x.id === msg.replyTo)?.text : undefined}
                    showAvatar={mIdx === run.messages.length - 1}
                    showSenderName={mIdx === 0 && chatMeta.peerType === 'chat' && Boolean(msg.sender && msg.sender.peerId !== chatMeta.peerId)}
                    senderMeta={!msg.out ? (msg.sender ?? {
                      letters: chatMeta.avatarLetters,
                      color: chatMeta.avatarColor,
                      peerType: chatMeta.peerType,
                      peerId: chatMeta.peerId,
                      accessHash,
                      hasPhoto: chatMeta.hasPhoto,
                      photoId: chatMeta.photoId,
                    }) : undefined}
                    selectMode={selectMode}
                    selected={selectedIds.includes(msg.id)}
                    onToggleSelect={toggleSelect}
                    onEnterSelect={(msgId) => { setSelectMode(true); setSelectedIds([msgId]); }}
                    onReply={msgId => { setEditingId(null); setReplyTo(msgId); }}
                    onEdit={msgId => { setReplyTo(null); setEditingId(msgId); }}
                    onPin={handlePin}
                    onDelete={(msgId) => setDeleteTargetIds([msgId])}
                    onForward={msgId => setForwardMsgIds([msgId])}
                    onReact={handleReact}
                    onOpenMedia={(src, type) =>
                      setMediaViewer({
                        src,
                        type,
                        senderName: msg.out ? 'You' : (msg.sender?.name || chatMeta.title),
                        date: msg.date,
                        caption: msg.text,
                        onForward: () => setForwardMsgIds([msg.id]),
                        onReply: () => { setEditingId(null); setReplyTo(msg.id); },
                        onDelete: () => setDeleteTargetIds([msg.id]),
                        isOut: msg.out,
                      })
                    }
                    onOpenForwarded={(chatId) => router.push(`/chat/${chatId}`)}
                    onOpenLocation={(loc) =>
                      setLocationPreview({
                        ...loc,
                        sender: !msg.out && !chatMeta.isSavedMessages
                          ? {
                              letters: chatMeta.avatarLetters,
                              color: chatMeta.avatarColor,
                              peerType: chatMeta.peerType,
                              peerId: chatMeta.peerId,
                              accessHash,
                              hasPhoto: chatMeta.hasPhoto,
                              photoId: chatMeta.photoId,
                            }
                          : undefined,
                      })
                    }
                  />
                ))}
              </BubbleGroup>
            ))}
          </div>
        ))}
        {partnerAction && (
          <div className="flex items-end justify-start gap-1.5 mt-1 mb-1">
            <Avatar
              letters={chatMeta.avatarLetters}
              color={chatMeta.avatarColor}
              size="xs"
              peerType={chatMeta.peerType}
              peerId={chatMeta.peerId}
              accessHash={accessHash}
              hasPhoto={chatMeta.hasPhoto}
              photoId={chatMeta.photoId}
            />
            <div className="bg-tg-bg-secondary border border-tg-border/40 rounded-2xl rounded-bl-[4px] px-4 py-2.5 flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-tg-text-hint" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              {partnerAction !== 'typing' && (
                <span className="text-xs text-tg-text-secondary">{partnerAction}…</span>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-3" />
        </div>{/* end flex-col justify-end */}
        </div>

        {/* Scroll to Bottom FAB - Anchored cleanly right above composer / action bar */}
        {showScrollBottom && (
          <button
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-tg-bg-secondary/95 backdrop-blur-md border border-tg-border/40 shadow-lg flex items-center justify-center text-tg-text active:scale-95 z-20 hover:bg-tg-bg-secondary"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {selectMode ? (
        <div className="bg-tg-bg border-t border-tg-border/35 px-6 py-3 safe-bottom flex items-center justify-around shrink-0">
        <button
          disabled={selectedIds.length === 0}
          onClick={() => setDeleteTargetIds(selectedIds)}
          className="p-2 text-rose-500 disabled:opacity-40"
          aria-label="Delete selected"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <button
          disabled={selectedIds.length === 0}
          onClick={() => {
            const txt = messages.filter(m => selectedIds.includes(m.id)).map(m => m.text).filter(Boolean).join('\n');
            navigator.clipboard.writeText(txt);
            toast('Copied selected messages', 'success');
            setSelectMode(false);
            setSelectedIds([]);
          }}
          className="p-2 text-tg-text disabled:opacity-40"
          aria-label="Copy selected"
        >
          <Copy className="w-5 h-5" />
        </button>
        <button
          disabled={selectedIds.length === 0}
          onClick={() => setForwardMsgIds(selectedIds)}
          className="p-2 text-tg-text disabled:opacity-40"
          aria-label="Forward selected"
        >
          <Forward className="w-5 h-5" />
        </button>
        </div>
      ) : chatPermissions && !chatPermissions.canSendMessages ? (
        /* ── Read-only / restricted banner ── */
        <div className="bg-tg-bg border-t border-tg-border shrink-0 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom,0px))]">
          <div className="flex items-center justify-center gap-2 py-1">
            <svg className="w-4 h-4 text-tg-text-hint shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <span className="text-tg-text-hint text-sm text-center leading-tight">
              {chatPermissions.restrictionReason ?? (chatPermissions.isBroadcast ? 'Channel is read-only' : 'You cannot send messages here')}
            </span>
          </div>
        </div>
      ) : (
        <MessageInput
          initialDraft={initialDraft}
          onDraftChange={(txt) => { if (id) saveDraft(id, txt).catch(() => {}); }}
          onTyping={(action) => { if (isMTProtoConfigured() && id) sendTyping(id, accessHash, action).catch(() => {}); }}
          onSend={handleSend}
          onSendFiles={handleSendFiles}
          onSendSticker={handleSendSticker}
          onSendLocation={handleSendLocation}
          onSendContact={handleSendContact}
          onSendPoll={handleSendPoll}
          replyTo={replyMsg ? { id: replyMsg.id, text: replyMsg.text } : undefined}
          editing={editMsg ? { id: editMsg.id, text: editMsg.text } : undefined}
          onCancelReply={() => setReplyTo(null)}
          onCancelEdit={() => setEditingId(null)}
          canSendMedia={chatPermissions?.canSendMedia ?? true}
          canSendStickers={chatPermissions?.canSendStickers ?? true}
          canSendPolls={chatPermissions?.canSendPolls ?? true}
          recentMessages={messages.slice(-10).map((m) => ({
            sender: m.out ? ('me' as const) : ('them' as const),
            name: m.out ? 'Me' : chatMeta.title,
            text: m.text || '[Media]',
          }))}
        />
      )}

      {/* iOS Delete Message Modal */}
      {deleteTargetIds && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-[280px] bg-tg-bg-secondary/95 backdrop-blur-xl border border-tg-border/40 rounded-2xl overflow-hidden shadow-2xl text-center">
            <div className="px-5 pt-5 pb-4">
              <h3 className="text-tg-text font-semibold text-base">Delete Message</h3>
              <p className="text-tg-text-secondary text-xs mt-1.5 leading-relaxed">
                Do you want to delete {deleteTargetIds.length > 1 ? 'these messages' : 'this message'} for everyone or only for yourself?
              </p>
            </div>
            <div className="divide-y divide-tg-border/35 border-t border-tg-border/35">
              <button
                onClick={() => handleDeleteConfirm(true)}
                className="w-full py-3 text-sm font-semibold text-rose-500 active:bg-tg-surface"
              >
                Delete for Everyone
              </button>
              <button
                onClick={() => handleDeleteConfirm(false)}
                className="w-full py-3 text-sm font-semibold text-tg-blue active:bg-tg-surface"
              >
                Delete for Me
              </button>
              <button
                onClick={() => setDeleteTargetIds(null)}
                className="w-full py-3 text-sm font-medium text-tg-text-secondary active:bg-tg-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {mediaViewer && (
        <MediaViewer
          src={mediaViewer.src}
          type={mediaViewer.type}
          senderName={mediaViewer.senderName}
          date={mediaViewer.date}
          caption={mediaViewer.caption}
          onForward={mediaViewer.onForward}
          onReply={mediaViewer.onReply}
          onDelete={mediaViewer.onDelete}
          isOut={mediaViewer.isOut}
          onClose={() => setMediaViewer(null)}
        />
      )}

      {locationPreview && (
        <LocationPreviewModal
          location={locationPreview}
          onClose={() => setLocationPreview(null)}
        />
      )}

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={chatMeta.title}>
        <div className="px-4 pb-6 space-y-1">
          <button
            onClick={() => { setMenuOpen(false); startAiCall(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-tg-blue active:bg-tg-surface text-left font-medium"
          >
            <img src="/icons/ai-brain.png" alt="AI" className="w-5 h-5 object-contain" />
            <span>AI Voice Call</span>
          </button>
          <button
            onClick={() => { setMenuOpen(false); router.push(`/profile/${chatMeta.peerId}`); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-tg-text active:bg-tg-surface text-left"
          >
            <User className="w-4 h-4 text-tg-blue" /><span>View Profile</span>
          </button>
          <button
            onClick={() => { setMuted((v) => !v); setMenuOpen(false); toast(muted ? 'Notifications enabled' : 'Chat muted'); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-tg-text active:bg-tg-surface text-left"
          >
            {muted ? <Bell className="w-4 h-4 text-tg-blue" /> : <BellOff className="w-4 h-4 text-tg-text-secondary" />}
            <span>{muted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
          </button>
          <button
            onClick={() => { setMessages([]); setMenuOpen(false); toast('Cleared'); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-tg-red active:bg-tg-surface text-left"
          >
            <Trash2 className="w-4 h-4" /><span>Clear View</span>
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={Boolean(forwardMsgIds?.length)} onClose={() => setForwardMsgIds(null)} title="Forward to...">
        <div className="max-h-72 overflow-y-auto px-4 pb-6 space-y-1">
          {dialogs.length === 0 && (
            <p className="text-tg-text-hint text-sm text-center py-6">No chats available</p>
          )}
          {dialogs.map((d) => {
            const isSaved = Boolean(d.isSavedMessages || (myUserId && d.peerId === myUserId));
            return (
              <button
                key={d.id}
                onClick={() => handleForwardTo(d.id, d.accessHash)}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl active:bg-tg-surface text-left"
              >
                <Avatar
                  letters={d.avatarLetters}
                  color={d.avatarColor}
                  size="sm"
                  isSavedMessages={isSaved}
                  peerType={d.peerType}
                  peerId={d.peerId}
                  accessHash={d.accessHash}
                  hasPhoto={d.hasPhoto}
                  photoId={d.photoId}
                />
                <span className="text-tg-text text-sm font-medium truncate">
                  {isSaved ? 'Saved Messages' : d.title}
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}
