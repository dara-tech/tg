'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart2,
  Bell,
  BellOff,
  Check,
  FileText,
  Film,
  FolderPlus,
  Image as ImageIcon,
  Link2,
  MapPin,
  MessageCircle,
  Mic,
  Pin,
  Play,
  Search,
  Smile,
  SquarePen,
  Trash2,
  User as UserIcon,
  VolumeX,
  X,
} from 'lucide-react';
import { Avatar }     from '@/components/ui/Avatar';
import { TelegramTicks } from '@/components/ui/TelegramTicks';
import { Badge }      from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button }     from '@/components/ui/Button';
import { Input }      from '@/components/ui/Input';
import { DialogSkeletonList } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { toast }      from '@/components/ui/Toast';
import { StoriesRow } from './StoriesRow';
import { useAuthStore } from '@/store/auth.store';
import { useDialogsStore, type DialogMediaMeta } from '@/store/dialogs.store';
import { getCachedMessages, setCachedMessages } from '@/features/conversations/ConversationScreen';
import { onMTProtoUpdate } from '@/core/telegram/mtproto.client';
import { createRealChannel, createRealGroup, downloadMediaUrl, fetchRealDialogs, fetchRealHistory, fetchRealStories, getMediaPreviewLabel, isMTProtoConfigured, parseMedia, toDialogMediaMeta, type MediaAttachment, type RawMedia, type RealDialogItem, type RealMessageItem, type RealStoryItem } from '@/services/telegram.real';
import { format, isToday, differenceInCalendarDays } from 'date-fns';

type Tab = 'all' | 'personal' | 'groups' | 'channels' | 'unread';

function formatDialogTime(ts: number) {
  const d = new Date(ts * 1000);
  if (isToday(d)) return format(d, 'HH:mm');
  if (differenceInCalendarDays(new Date(), d) < 7) return format(d, 'EEE');
  return format(d, 'M/d');
}

function PreviewMedia({
  media,
  hasCaption,
  hasHeader = false,
  time,
  isOut,
  status,
}: {
  media: MediaAttachment;
  hasCaption: boolean;
  hasHeader?: boolean;
  time: string;
  isOut: boolean;
  status?: string;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(media.localUrl ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (media.localUrl) {
      setBlobUrl(media.localUrl);
      return;
    }
    if (
      media.kind === 'photo' ||
      (media.kind === 'video' && Boolean(media.thumbSize)) ||
      (media.kind === 'sticker' &&
        (media.mimeType?.startsWith('image/') ||
          media.mimeType?.startsWith('video/') ||
          media.mimeType === 'application/x-tgsticker'))
    ) {
      let cancelled = false;
      setLoading(true);
      downloadMediaUrl(media, media.kind === 'video')
        .then((url) => {
          if (!cancelled) setBlobUrl(url);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [media]);

  if (media.kind === 'photo') {
    const isFullWidth = hasCaption || hasHeader;
    const radiusClass = hasHeader
      ? 'rounded-none'
      : hasCaption
      ? 'rounded-t-2xl'
      : 'rounded-2xl';
    return (
      <div className={`relative overflow-hidden ${isFullWidth ? 'w-full' : ''}`}>
        {blobUrl ? (
          <img
            src={blobUrl}
            alt="Photo"
            className={`block object-cover ${
              isFullWidth
                ? `w-full max-h-[240px] ${radiusClass}`
                : 'max-w-[220px] max-h-[220px] min-w-[140px] rounded-2xl'
            }`}
          />
        ) : (
          <div
            className={`bg-tg-surface flex flex-col items-center justify-center gap-1 text-tg-text-hint ${
              isFullWidth ? `w-full h-[160px] ${radiusClass}` : 'w-[180px] h-[130px]'
            }`}
          >
            <ImageIcon className="w-6 h-6 opacity-60" />
            <span className="text-[11px]">{loading ? 'Loading…' : 'Photo'}</span>
          </div>
        )}
        {!hasCaption && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-white/95 text-[10px] flex items-center gap-1">
            <span>{time}</span>
            {isOut && (
              <TelegramTicks
                variant={status === 'read' ? 'double' : 'single'}
                className="w-3.5 h-2.5 text-sky-200 shrink-0"
              />
            )}
          </span>
        )}
      </div>
    );
  }

  if (media.kind === 'sticker') {
    if (blobUrl) {
      if (media.mimeType?.startsWith('video/')) {
        return <video src={blobUrl} autoPlay loop muted playsInline className="w-24 h-24 object-contain" />;
      }
      return <img src={blobUrl} alt={media.fileName || 'Sticker'} className="w-24 h-24 object-contain" />;
    }
    return <span className="text-4xl block p-2">{media.fileName?.replace('Sticker ', '') || '🧩'}</span>;
  }

  if (media.kind === 'video') {
    const dur = media.duration
      ? `${Math.floor(media.duration / 60)}:${String(Math.floor(media.duration % 60)).padStart(2, '0')}`
      : 'Video';
    if (blobUrl) {
      const isFullWidth = hasCaption || hasHeader;
      const radiusClass = hasHeader
        ? 'rounded-none'
        : hasCaption
        ? 'rounded-t-2xl'
        : 'rounded-xl';
      return (
        <div className={`relative overflow-hidden ${isFullWidth ? `w-full ${radiusClass}` : 'rounded-xl'}`}>
          <img
            src={blobUrl}
            alt="Video"
            className={`block object-cover ${
              isFullWidth ? 'w-full max-h-[220px]' : 'max-w-[220px] max-h-[180px] min-w-[140px]'
            }`}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <div className="w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
          </div>
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
            {dur}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-xs font-medium py-0.5">
        <div className="w-7 h-7 rounded-full bg-black/25 flex items-center justify-center shrink-0">
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        </div>
        <span>{dur}</span>
      </div>
    );
  }

  if (media.kind === 'voice') {
    const dur = media.duration
      ? `${Math.floor(media.duration / 60)}:${String(Math.floor(media.duration % 60)).padStart(2, '0')}`
      : 'Voice';
    return (
      <div className="flex items-center gap-2 text-xs font-medium py-0.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isOut ? 'bg-white/20' : 'bg-tg-blue/15 text-tg-blue'}`}>
          <Mic className="w-3.5 h-3.5" />
        </div>
        <span>Voice · {dur}</span>
      </div>
    );
  }

  if (media.kind === 'webpage') {
    if (!media.webPage?.title && !media.webPage?.siteName) return null;
    return (
      <div className="border-l-2 border-tg-blue pl-2 my-1 text-left">
        {media.webPage.siteName && <p className="text-[11px] font-bold opacity-85">{media.webPage.siteName}</p>}
        {media.webPage.title && <p className="text-xs font-medium line-clamp-2">{media.webPage.title}</p>}
      </div>
    );
  }

  if (media.kind === 'document') {
    const sizeStr = media.size
      ? media.size >= 1024 * 1024
        ? `${(media.size / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`
        : `${(media.size / 1024).toFixed(1).replace(/\.0$/, '')} KB`
      : '';
    const ext = media.fileName?.match(/\.([a-zA-Z0-9]{1,6})$/)?.[1]?.toUpperCase() || 'FILE';
    return (
      <div className="flex items-center gap-2 py-0.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isOut ? 'bg-white/20 text-white' : 'bg-tg-blue/15 text-tg-blue'}`}>
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate max-w-[180px]">{media.fileName || 'File'}</p>
          <p className="text-[10px] opacity-75">{[sizeStr, ext].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
    );
  }

  return (
    <p className="text-xs opacity-85">
      {media.kind === 'geo'
        ? `📍 ${media.title || 'Location'}`
        : media.kind === 'contact'
        ? `👤 ${media.contactName || 'Contact'}`
        : media.kind === 'poll'
        ? `📊 ${media.pollQuestion || 'Poll'}`
        : `📎 ${media.fileName || 'Attachment'}`}
    </p>
  );
}

export default function ChatListScreen() {
  const router = useRouter();
  const [tab, setTab]     = useState<Tab>('all');
  const [error, setError] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newType, setNewType] = useState<'group' | 'channel'>('group');
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [previewDialog, setPreviewDialog] = useState<RealDialogItem | null>(null);
  const [previewMessages, setPreviewMessages] = useState<RealMessageItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [storiesExpanded, setStoriesExpanded] = useState(false);
  const [stories, setStories] = useState<RealStoryItem[]>([]);
  const [myStories, setMyStories] = useState<RealStoryItem[]>([]);
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [myProfile, setMyProfile] = useState<{
    id?: number;
    accessHash?: string;
    name: string;
    letters: string;
    color: string;
    hasPhoto?: boolean;
    photoId?: string;
  } | undefined>(undefined);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const myUserId = useAuthStore((s) => s.userId);
  const {
    dialogs,
    isLoading,
    isLoadingMore,
    hasMore,
    lastFetchedAt,
    setDialogs,
    appendDialogs,
    setLoading,
    setLoadingMore,
    setHasMore,
    updateUnread,
    updateLastMessage,
  } = useDialogsStore();
  const [initialized, setInitialized] = useState(() => dialogs.length > 0 || lastFetchedAt > 0);
  // Track whether a fresh fetch is in-flight (separate from isLoading to avoid skeleton flash on stale-while-revalidate)
  const fetchingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dialogs.slice(0, 6).forEach((d) => {
      router.prefetch(`/chat/${d.id}`);
    });
  }, [dialogs, router]);

  useEffect(() => {
    if (!previewDialog) {
      setPreviewMessages([]);
      setPreviewLoading(false);
      return;
    }
    if (!isMTProtoConfigured()) return;
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewMessages([]);
    fetchRealHistory(
      previewDialog.id,
      previewDialog.accessHash || '0',
      25,
      previewDialog.readOutboxMaxId ?? 0
    )
      .then((msgs) => {
        if (cancelled) return;
        setPreviewMessages(msgs);
        requestAnimationFrame(() => {
          if (previewScrollRef.current) {
            previewScrollRef.current.scrollTop = previewScrollRef.current.scrollHeight;
          }
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => { cancelled = true; };
  }, [previewDialog]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('tg-my-profile');
      if (cached) {
        const p = JSON.parse(cached) as {
          id?: number;
          accessHash?: string;
          name?: string;
          color?: string;
          hasPhoto?: boolean;
          photoId?: string;
        };
        if (p.name) {
          setMyProfile({
            id: p.id,
            accessHash: p.accessHash,
            name: p.name,
            letters: p.name.slice(0, 2).toUpperCase(),
            color: p.color || '#2563EB',
            hasPhoto: p.hasPhoto,
            photoId: p.photoId,
          });
        }
      }
    } catch {}
    if (!isMTProtoConfigured()) return;
    fetchRealStories().then(setStories).catch(() => {});
  }, []);

  useEffect(() => {
    if (storiesExpanded && stories.length === 0 && isMTProtoConfigured()) {
      fetchRealStories().then(setStories).catch(() => {});
    }
  }, [storiesExpanded, stories.length]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tg-my-stories');
      if (saved) {
        const parsed = JSON.parse(saved) as RealStoryItem[];
        const cutoff = Math.floor(Date.now() / 1000) - 86400;
        setMyStories(parsed.filter((s) => s.date > cutoff));
      }
    } catch {}
  }, []);

  const loadDialogs = useCallback((force = false) => {
    if (!isMTProtoConfigured()) {
      setError('Configure NEXT_PUBLIC_API_ID and NEXT_PUBLIC_API_HASH in .env.local to connect to Telegram.');
      setDialogs([]);
      setInitialized(true);
      return;
    }
    // Debounce: skip if already in-flight
    if (fetchingRef.current && !force) return;
    fetchingRef.current = true;

    // Show spinner only when we have no cached data to display
    if (dialogs.length === 0) setLoading(true);
    setError('');

    fetchRealDialogs(40, 0)
      .then((real) => setDialogs(real, real.length >= 40))
      .catch((e: unknown) => {
        const errObj = e as { error_message?: string; message?: string; type?: string };
        const rawMsg = e instanceof Error
          ? e.message
          : errObj?.error_message || errObj?.message || (errObj?.type ? `Connection error (${errObj.type})` : 'Sign in required to load chats.');
        console.warn('[Dialogs] fetchRealDialogs:', rawMsg, e);
        if (errObj?.error_message === 'SESSION_PASSWORD_NEEDED') {
          router.replace('/auth?step=password');
          return;
        }
        if (rawMsg.startsWith('FLOOD_WAIT_')) {
          const secs = rawMsg.replace('FLOOD_WAIT_', '');
          setError(`Rate limited by Telegram. Please wait ${secs}s and tap Retry.`);
          return;
        }
        // Don't show error if we already have cached dialogs
        if (dialogs.length === 0) setError(rawMsg);
      })
      .finally(() => {
        fetchingRef.current = false;
        setLoading(false);
        setInitialized(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || dialogs.length === 0 || !isMTProtoConfigured()) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const last = dialogs[dialogs.length - 1];
      const more = await fetchRealDialogs(
        40,
        last.lastMessageDate,
        last.topMessageId || 0,
        last.id,
        last.accessHash || '0'
      );

      if (!more || more.length === 0) {
        setHasMore(false);
      } else {
        appendDialogs(more, more.length >= 40);
      }
    } catch (e) {
      console.warn('[Dialogs] handleLoadMore error:', e);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, dialogs, appendDialogs, setLoadingMore, setHasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '350px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  useEffect(() => {
    // Initial load
    loadDialogs(false);

    // Re-fetch when app comes back to foreground
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadDialogs(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    // Live updates via MTProto
    let unsub: (() => void) | undefined;
    if (isMTProtoConfigured()) {
      try {
        unsub = onMTProtoUpdate((ev) => {
          const updates = ev.updates ?? (ev.update ? [ev.update] : []);
          let shouldRefresh = false;
          for (const u of updates as Array<{
            _: string;
            max_id?: number;
            message?: {
              id: number;
              message?: string;
              date: number;
              out?: boolean;
              media?: RawMedia;
              action?: { _: string };
              peer_id?: { user_id?: string | number; chat_id?: string | number; channel_id?: string | number };
            };
          }>) {
            if ((u._ === 'updateNewMessage' || u._ === 'updateNewChannelMessage') && u.message) {
              const p = u.message.peer_id;
              const peerKey = p?.user_id ? `u_${p.user_id}` : p?.channel_id ? `c_${p.channel_id}` : p?.chat_id ? `g_${p.chat_id}` : '';
              if (peerKey) {
                const exists = useDialogsStore.getState().dialogs.some((d) => d.id === peerKey);
                if (exists) {
                  const liveMedia = parseMedia(u.message.media);
                  const preview = u.message.message || getMediaPreviewLabel(liveMedia) || (u.message.action ? 'Service message' : '');
                  if (preview) {
                    updateLastMessage(peerKey, preview, u.message.date, Boolean(u.message.out), false, toDialogMediaMeta(liveMedia));
                  } else {
                    shouldRefresh = true;
                  }
                } else {
                  shouldRefresh = true;
                }
              }
            } else if (u._ === 'updateReadHistoryOutbox' || u._ === 'updateReadHistoryInbox' || u._ === 'updateReadChannelOutbox') {
              // Re-fetch to get latest read_outbox_max_id for tick status
              shouldRefresh = true;
            }
          }
          if (shouldRefresh) loadDialogs(false);
        });
      } catch {
        // MTProto not initialized yet
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      unsub?.();
    };
    // loadDialogs is stable via useCallback
  }, [loadDialogs]);

  const filtered = dialogs.filter((d) => {
    const matchesTab =
      tab === 'all'      ? true :
      tab === 'personal' ? d.peerType === 'user' :
      tab === 'groups'   ? d.peerType === 'chat' :
      tab === 'channels' ? d.peerType === 'channel' :
      d.unreadCount > 0;
    if (!matchesTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.lastMessage.toLowerCase().includes(q);
  });

  const tabCounts = useMemo(() => ({
    personal: dialogs.filter((d) => d.peerType === 'user' && d.unreadCount > 0).length,
    groups:   dialogs.filter((d) => d.peerType === 'chat' && d.unreadCount > 0).length,
    channels: dialogs.filter((d) => d.peerType === 'channel' && d.unreadCount > 0).length,
    unread:   dialogs.filter((d) => d.unreadCount > 0).length,
  }), [dialogs]);

  const headerAvatars = useMemo(
    () => [...myStories, ...stories].slice(0, 3),
    [myStories, stories]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-tg-bg relative">
      {/* ── iOS-style Chats Header ── */}
      <div className="px-4 pt-3 pb-2 safe-top bg-tg-bg shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <button
            onClick={() => {
              setEditMode((v) => !v);
              setSelectedIds([]);
            }}
            className="px-4 h-9 rounded-full bg-tg-bg-secondary border border-tg-border/40 text-sm font-medium text-tg-text active:scale-95 transition-transform"
          >
            {editMode ? 'Done' : 'Edit'}
          </button>

          <button
            type="button"
            onClick={() => setStoriesExpanded((v) => !v)}
            className="flex items-center gap-2 px-2 py-1 rounded-full active:scale-95 transition-transform"
            aria-label="Toggle stories and search"
          >
            {!storiesExpanded && headerAvatars.length > 0 && (
              <div className="flex items-center -space-x-2">
                {headerAvatars.map((d, idx) => (
                  <div key={`${d.id}-${idx}`} className="rounded-full ring-2 ring-tg-bg">
                    <Avatar
                      letters={d.letters || d.name[0]}
                      color={d.color.startsWith('linear') ? '#2563EB' : d.color}
                      size="xs"
                      peerType={d.peerType}
                      peerId={d.peerId}
                      accessHash={d.accessHash}
                      hasPhoto={d.hasPhoto}
                      photoId={d.photoId}
                    />
                  </div>
                ))}
              </div>
            )}
            <h1 className="text-tg-text text-[18px] font-bold tracking-tight leading-none">Chats</h1>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setStoriesExpanded(true);
                setStoryComposerOpen(true);
              }}
              className="w-9 h-9 rounded-full bg-tg-bg-secondary border border-tg-border/40 flex items-center justify-center text-tg-text active:scale-95 transition-transform"
              aria-label="Add story"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" strokeDasharray="3.2 2.6" strokeLinecap="round" />
                <path d="M12 8.5v7M8.5 12h7" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={() => setNewChatOpen(true)}
              className="w-9 h-9 rounded-full bg-tg-blue flex items-center justify-center text-white active:scale-95 transition-transform"
              aria-label="New Chat"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Expandable Stories + Search Drawer (toggled by tapping header) ── */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            storiesExpanded ? 'max-h-[190px] opacity-100 mb-2.5' : 'max-h-0 opacity-0'
          }`}
        >
          <StoriesRow
            stories={stories}
            myStories={myStories}
            myProfile={myProfile}
            composerOpen={storyComposerOpen}
            onOpenComposer={() => setStoryComposerOpen(true)}
            onCloseComposer={() => setStoryComposerOpen(false)}
            onCreateStory={(s) => {
              setMyStories((prev) => {
                const next = [s, ...prev];
                try { localStorage.setItem('tg-my-stories', JSON.stringify(next)); } catch {}
                return next;
              });
            }}
            onDeleteMyStory={(delId) => {
              setMyStories((prev) => {
                const next = prev.filter((x) => x.id !== delId);
                try { localStorage.setItem('tg-my-stories', JSON.stringify(next)); } catch {}
                return next;
              });
            }}
          />

          <div className="mt-1 relative flex items-center">
            <div className="w-full h-9 rounded-full bg-tg-surface px-3.5 flex items-center gap-2 border border-tg-border/60">
              <Search className="w-4 h-4 text-tg-text-hint shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    router.push('/search');
                  }
                }}
                placeholder="Search"
                className="w-full bg-transparent text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-tg-text-hint hover:text-tg-text p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Folder Tabs Pill Bar ── */}
        <div className="bg-tg-bg-secondary border border-tg-border/40 rounded-full p-1 overflow-hidden">
          <div className="flex items-center justify-between gap-0.5 overflow-x-auto scrollbar-hide rounded-full">
            {([
              { id: 'all',      label: 'All',      count: 0 },
              { id: 'personal', label: 'Personal', count: tabCounts.personal },
              { id: 'groups',   label: 'Groups',   count: tabCounts.groups },
              { id: 'channels', label: 'Channels', count: tabCounts.channels },
              { id: 'unread',   label: 'Unread',   count: tabCounts.unread },
            ] as { id: Tab; label: string; count: number }[]).map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-full text-[11.5px] flex items-center justify-center gap-1 transition-all ${
                    active
                      ? 'bg-tg-surface text-tg-text font-semibold'
                      : 'text-tg-text-secondary font-medium'
                  }`}
                >
                  <span>{t.label}</span>
                  {t.count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-tg-blue text-white text-[10px] font-bold leading-none tabular-nums">
                      {t.count > 99 ? '99+' : t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Dialog list ── */}
      <div
        onScroll={(e) => {
          if (storiesExpanded && !searchQuery.trim() && e.currentTarget.scrollTop > 12) {
            setStoriesExpanded(false);
          }
        }}
        onWheel={(e) => {
          if (storiesExpanded && !searchQuery.trim() && e.deltaY > 12) {
            setStoriesExpanded(false);
          }
        }}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      >
        {(!initialized || isLoading) && dialogs.length === 0 && <DialogSkeletonList />}
        {initialized && !isLoading && error && dialogs.length === 0 && (
          <div className="px-6 mt-16 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-tg-bg-secondary border border-tg-border flex items-center justify-center text-tg-blue">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>
            </div>
            <p className="text-tg-text-secondary text-sm">{error}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => loadDialogs(true)} className="w-auto px-5 whitespace-nowrap">
                Retry
              </Button>
              <Button size="sm" onClick={() => router.push('/auth')} className="w-auto px-5 whitespace-nowrap">
                Sign In
              </Button>
            </div>
          </div>
        )}
        {initialized && !isLoading && !error && filtered.length === 0 && (
          <div className="px-6 mt-16 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-tg-bg-secondary border border-tg-border flex items-center justify-center text-tg-text-hint">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>
            </div>
            <p className="text-tg-text font-semibold text-base">
              {tab === 'all' ? 'No chats yet' : `No ${tab} yet`}
            </p>
          </div>
        )}
        {filtered.length > 0 && (
          <div>
            {filtered.map((dialog, idx) => (
              <div key={dialog.id}>
                <DialogRow
                  dialog={dialog}
                  isSaved={Boolean(dialog.isSavedMessages || (myUserId && dialog.peerId === myUserId))}
                  editMode={editMode}
                  selected={selectedIds.includes(dialog.id)}
                  onClick={() => {
                    if (editMode) toggleSelect(dialog.id);
                    else router.push(`/chat/${dialog.id}`);
                  }}
                  onPrefetch={() => {
                    router.prefetch(`/chat/${dialog.id}`);
                    if (isMTProtoConfigured() && getCachedMessages(dialog.id).length === 0) {
                      fetchRealHistory(dialog.id, dialog.accessHash || '0', 10, dialog.readOutboxMaxId ?? 0)
                        .then((msgs) => {
                          if (msgs.length > 0) setCachedMessages(dialog.id, msgs);
                        })
                        .catch(() => {});
                    }
                  }}
                  onLongPress={() => { if (!editMode) setPreviewDialog(dialog); }}
                />
                {idx < filtered.length - 1 && (
                  <div className="ml-[84px] border-b border-tg-border/60" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Infinite Scroll Sentinel / Load More ── */}
        {filtered.length > 0 && (
          <div ref={sentinelRef} className="py-4 flex flex-col items-center justify-center">
            {isLoadingMore ? (
              <div className="flex items-center gap-2 text-tg-text-hint text-xs py-2">
                <Spinner className="w-4 h-4" />
                <span>Loading more chats...</span>
              </div>
            ) : hasMore ? (
              <button
                type="button"
                onClick={handleLoadMore}
                className="text-xs text-tg-blue hover:text-tg-blue-dark py-1.5 px-3 rounded-full hover:bg-tg-surface transition-colors"
              >
                Load older chats
              </button>
            ) : (
              <p className="text-tg-text-hint/50 text-[11px] py-1">All chats loaded</p>
            )}
          </div>
        )}

        <div className="h-4" />
      </div>

      {editMode && selectedIds.length > 0 && (
        <div className="px-4 py-2.5 bg-tg-bg-secondary border-t border-tg-border flex items-center justify-around shrink-0">
          <button
            onClick={() => {
              selectedIds.forEach((sid) => updateUnread(sid, 0));
              setEditMode(false);
              setSelectedIds([]);
              toast('Marked as read', 'success');
            }}
            className="text-xs font-semibold text-tg-blue px-3 py-1.5 rounded-full active:bg-tg-surface"
          >
            Read ({selectedIds.length})
          </button>
          <button
            onClick={() => {
              setDialogs(dialogs.map((d) => (selectedIds.includes(d.id) ? { ...d, isMuted: !d.isMuted } : d)));
              setEditMode(false);
              setSelectedIds([]);
            }}
            className="text-xs font-semibold text-tg-text px-3 py-1.5 rounded-full active:bg-tg-surface"
          >
            Mute
          </button>
          <button
            onClick={() => {
              setDialogs(dialogs.filter((d) => !selectedIds.includes(d.id)));
              setEditMode(false);
              setSelectedIds([]);
              toast('Removed from list', 'info');
            }}
            className="text-xs font-semibold text-rose-500 px-3 py-1.5 rounded-full active:bg-rose-500/10"
          >
            Delete
          </button>
        </div>
      )}

      <BottomSheet open={newChatOpen} onClose={() => setNewChatOpen(false)} title="New Group or Channel">
        <div className="p-5 space-y-3">
          <div className="flex gap-2">
            {(['group', 'channel'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                  newType === t ? 'border-tg-blue bg-tg-blue/15 text-tg-blue' : 'border-tg-border text-tg-text-secondary hover:bg-tg-surface'
                }`}
              >
                {t === 'group' ? 'Group' : 'Channel'}
              </button>
            ))}
          </div>
          <Input label="Title" placeholder={newType === 'group' ? 'Group name' : 'Channel name'} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="secondary" onClick={() => setNewChatOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={creating}
              onClick={async () => {
                if (!newTitle.trim()) return toast('Enter a title', 'error');
                setCreating(true);
                try {
                  if (newType === 'group') await createRealGroup(newTitle.trim(), []);
                  else await createRealChannel(newTitle.trim());
                  toast(`${newType === 'group' ? 'Group' : 'Channel'} created`, 'success');
                  setNewChatOpen(false);
                  setNewTitle('');
                  loadDialogs(true);
                } catch (e: unknown) {
                  const err = e as { error_message?: string; message?: string };
                  toast(err?.error_message || err?.message || 'Could not create', 'error');
                } finally {
                  setCreating(false);
                }
              }}
            >
              Create {newType === 'group' ? 'Group' : 'Channel'}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Chat Preview + Context Menu Modal */}
      {previewDialog && (
        <div
          onClick={() => setPreviewDialog(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] max-h-[90vh] flex flex-col gap-2.5 animate-in fade-in zoom-in-95"
          >
            {/* Chat Preview Card */}
            <div className="w-full bg-tg-bg rounded-3xl border border-tg-border/40 shadow-2xl overflow-hidden flex flex-col">
              <button
                onClick={() => {
                  const target = previewDialog.id;
                  setPreviewDialog(null);
                  router.push(`/chat/${target}`);
                }}
                className="w-full px-4 py-3 border-b border-tg-border/35 bg-tg-bg-secondary/90 flex items-center gap-3 text-left active:bg-tg-surface transition-colors"
              >
                <Avatar
                  letters={previewDialog.avatarLetters}
                  color={previewDialog.avatarColor}
                  online={previewDialog.isOnline}
                  size="sm"
                  peerType={previewDialog.peerType}
                  peerId={previewDialog.peerId}
                  accessHash={previewDialog.accessHash}
                  hasPhoto={previewDialog.hasPhoto}
                  photoId={previewDialog.photoId}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-tg-text text-sm font-bold truncate">{previewDialog.title}</p>
                  <p className="text-tg-blue text-xs font-medium capitalize">
                    {previewDialog.isOnline ? 'online' : previewDialog.peerType}
                  </p>
                </div>
                <span className="text-xs text-tg-blue font-semibold px-2.5 py-1 rounded-full bg-tg-blue/10">
                  Open
                </span>
              </button>

              <div
                ref={previewScrollRef}
                className="p-3.5 bg-tg-bg-tertiary h-[300px] sm:h-[360px] overflow-y-auto space-y-2"
              >
                {previewLoading && previewMessages.length === 0 ? (
                  <div className="h-full flex flex-col justify-end gap-2">
                    <div className="flex justify-center py-4">
                      <Spinner />
                    </div>
                    {previewDialog.lastMessage && (
                      <div className="flex justify-start">
                        <div className="bg-tg-bg-secondary border border-tg-border rounded-2xl rounded-bl-[4px] px-3.5 py-2.5 max-w-[85%]">
                          <p className="text-tg-text text-sm leading-relaxed">{previewDialog.lastMessage}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-tg-text-hint">
                            <span>{formatDialogTime(previewDialog.lastMessageDate)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : previewMessages.length === 0 ? (
                  <div className="h-full flex flex-col justify-end">
                    <div className="bg-tg-bg-secondary border border-tg-border rounded-2xl rounded-bl-[4px] px-3.5 py-2.5 max-w-[85%]">
                      <p className="text-tg-text text-sm leading-relaxed">{previewDialog.lastMessage || 'No messages'}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-tg-text-hint">
                        <span>{formatDialogTime(previewDialog.lastMessageDate)}</span>
                        {previewDialog.lastMessageOut && (
                          <TelegramTicks variant={previewDialog.lastMessageRead ? 'double' : 'single'} className="w-3.5 h-2.5 text-tg-blue shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  previewMessages.map((m) => {
                    if (m.isService) {
                      return (
                        <div key={m.id} className="flex justify-center my-1">
                          <span className="px-3 py-1 rounded-full bg-tg-bg-secondary/90 border border-tg-border text-tg-text-secondary text-[11px]">
                            {m.text}
                          </span>
                        </div>
                      );
                    }
                    const time = formatDialogTime(m.date);
                    const hasHeader = Boolean(m.forwardedFrom);
                    const isEdgePhoto = Boolean(m.media && !m.text && !hasHeader && (m.media.kind === 'photo' || m.media.kind === 'sticker'));
                    const hasCaption = Boolean(m.media && m.text);
                    const hasPhotoHeader = Boolean((hasCaption || hasHeader) && (m.media?.kind === 'photo' || m.media?.kind === 'video'));
                    return (
                      <div key={m.id} className={`flex ${m.out ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`rounded-2xl max-w-[85%] overflow-hidden ${
                            isEdgePhoto
                              ? 'p-0 bg-transparent'
                              : m.out
                              ? `chat-go-gradient text-white rounded-br-[4px] ${hasPhotoHeader ? 'p-0' : 'px-3.5 py-2'}`
                              : `bg-tg-bg-secondary border border-tg-border text-tg-text rounded-bl-[4px] ${hasPhotoHeader ? 'p-0' : 'px-3.5 py-2'}`
                          }`}
                        >
                          {m.forwardedFrom && (
                            <p className={`text-[11px] font-medium mb-0.5 truncate ${hasPhotoHeader ? 'px-3 pt-2 pb-1' : ''} ${m.out ? 'text-white/85' : 'text-tg-blue'}`}>
                              Forwarded from <span className="font-semibold">{m.forwardedFrom.name}</span>
                            </p>
                          )}
                          {m.media && (
                            <PreviewMedia
                              media={m.media}
                              hasCaption={hasCaption}
                              hasHeader={hasHeader}
                              time={time}
                              isOut={m.out}
                              status={m.status}
                            />
                          )}
                          {m.text && (
                            <div className={hasPhotoHeader ? 'px-3 py-1.5' : ''}>
                              <p className="text-sm leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap">{m.text}</p>
                            </div>
                          )}
                          {!isEdgePhoto && (
                            <div
                              className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] ${
                                hasPhotoHeader ? 'px-3 pb-1.5' : ''
                              } ${m.out ? 'text-white/75' : 'text-tg-text-hint'}`}
                            >
                              <span>{time}</span>
                              {m.out && (
                                <TelegramTicks
                                  variant={m.status === 'read' ? 'double' : 'single'}
                                  className="w-3.5 h-2.5 text-sky-200 shrink-0"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Context Actions Card */}
            <div className="w-full bg-tg-bg-secondary border border-tg-border/40 rounded-2xl overflow-hidden shadow-2xl divide-y divide-tg-border/35">
              <button
                onClick={() => {
                  updateUnread(previewDialog.id, previewDialog.unreadCount > 0 ? 0 : 1);
                  setPreviewDialog(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-tg-text hover:bg-tg-surface active:bg-tg-surface transition-colors text-left"
              >
                <MessageCircle className="w-4 h-4 text-tg-blue" />
                <span>{previewDialog.unreadCount > 0 ? 'Mark as Read' : 'Mark as Unread'}</span>
              </button>
              <button
                onClick={() => {
                  setDialogs(dialogs.map((d) => (d.id === previewDialog.id ? { ...d, isPinned: !d.isPinned } : d)));
                  setPreviewDialog(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-tg-text hover:bg-tg-surface active:bg-tg-surface transition-colors text-left"
              >
                <Pin className="w-4 h-4 text-tg-blue" />
                <span>{previewDialog.isPinned ? 'Unpin' : 'Pin to Top'}</span>
              </button>
              <button
                onClick={() => {
                  setDialogs(dialogs.map((d) => (d.id === previewDialog.id ? { ...d, isMuted: !d.isMuted } : d)));
                  setPreviewDialog(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-tg-text hover:bg-tg-surface active:bg-tg-surface transition-colors text-left"
              >
                {previewDialog.isMuted ? <Bell className="w-4 h-4 text-tg-blue" /> : <BellOff className="w-4 h-4 text-tg-text-secondary" />}
                <span>{previewDialog.isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
              <button
                onClick={() => {
                  toast('Add to Folder coming soon', 'info');
                  setPreviewDialog(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-tg-text hover:bg-tg-surface active:bg-tg-surface transition-colors text-left"
              >
                <FolderPlus className="w-4 h-4 text-tg-blue" />
                <span>Add to Folder</span>
              </button>
              <button
                onClick={() => {
                  setDialogs(dialogs.filter((d) => d.id !== previewDialog.id));
                  setPreviewDialog(null);
                  toast('Chat removed from list', 'info');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-500 hover:bg-rose-500/10 active:bg-rose-500/10 transition-colors text-left"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DialogMediaBadge({ media, lastMessage }: { media?: DialogMediaMeta; lastMessage: string }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  const canThumb = Boolean(
    media &&
      isMTProtoConfigured() &&
      (media.kind === 'photo' ||
        (media.kind === 'video' && Boolean(media.thumbSize)) ||
        (media.kind === 'sticker' &&
          (media.mimeType?.startsWith('image/') || media.mimeType === 'application/x-tgsticker')))
  );

  useEffect(() => {
    if (!canThumb || !media) {
      setThumbUrl(null);
      return;
    }
    let active = true;
    downloadMediaUrl(
      {
        kind: media.kind,
        id: media.id,
        accessHash: media.accessHash,
        fileReference: media.fileReference ? new Uint8Array(media.fileReference) : undefined,
        dcId: media.dcId,
        thumbSize: media.thumbSize,
        mimeType: media.mimeType,
        fileName: media.fileName,
      },
      true
    ).then((u) => {
      if (active && u) setThumbUrl(u);
    });
    return () => { active = false; };
  }, [canThumb, media]);

  const kind =
    media?.kind ??
    (lastMessage === 'Photo' || lastMessage.startsWith('Photo, ') || lastMessage.startsWith('Photo: ')
      ? 'photo'
      : lastMessage === 'Video' || lastMessage.startsWith('Video, ') || lastMessage.startsWith('Video: ')
      ? 'video'
      : lastMessage === 'Voice message'
      ? 'voice'
      : lastMessage.startsWith('Sticker')
      ? 'sticker'
      : lastMessage === 'Location'
      ? 'geo'
      : lastMessage.startsWith('Contact:')
      ? 'contact'
      : lastMessage.startsWith('Poll:')
      ? 'poll'
      : lastMessage === 'Document' || lastMessage === 'File'
      ? 'document'
      : undefined);

  if (!kind) return null;

  if (thumbUrl) {
    return (
      <img
        src={thumbUrl}
        alt=""
        className="inline-block w-[18px] h-[18px] rounded-[4px] object-cover align-text-bottom mr-1.5 bg-tg-surface shrink-0"
      />
    );
  }

  const iconProps = 'inline-block w-3.5 h-3.5 text-tg-blue align-text-bottom mr-1 shrink-0';
  if (kind === 'photo') return <ImageIcon className={iconProps} />;
  if (kind === 'video') return <Film className={iconProps} />;
  if (kind === 'voice') return <Mic className={iconProps} />;
  if (kind === 'sticker') return <Smile className={iconProps} />;
  if (kind === 'geo') return <MapPin className={iconProps} />;
  if (kind === 'contact') return <UserIcon className={iconProps} />;
  if (kind === 'poll') return <BarChart2 className={iconProps} />;
  if (kind === 'webpage') return <Link2 className={iconProps} />;
  return <FileText className={iconProps} />;
}

function renderDialogLastMessage(text: string, unreadCount: number) {
  if (!text) {
    return <span className="text-tg-text-hint text-[13px]">No messages</span>;
  }
  if (text === '[Media]') {
    return <span className="font-bold text-tg-text">Media</span>;
  }

  const MEDIA_LABELS = [
    'Photo',
    'Video',
    'Voice message',
    'Video message',
    'Sticker',
    'GIF',
    'Document',
    'File',
    'Location',
    'Contact',
    'Poll',
    'Service message',
  ];

  const formatChunk = (chunk: string) => {
    for (const label of MEDIA_LABELS) {
      if (chunk === label) {
        return <span className="font-bold text-tg-text">{label}</span>;
      }
      if (chunk.startsWith(label + ', ') || chunk.startsWith(label + ': ')) {
        const rest = chunk.slice(label.length);
        return (
          <>
            <span className="font-bold text-tg-text">{label}</span>
            <span className={unreadCount > 0 ? 'text-tg-text' : 'text-tg-text-secondary'}>{rest}</span>
          </>
        );
      }
    }
    return null;
  };

  const direct = formatChunk(text);
  if (direct) return direct;

  const colonIdx = text.indexOf(': ');
  if (colonIdx > 0 && colonIdx < 30) {
    const sender = text.slice(0, colonIdx);
    const content = text.slice(colonIdx + 2);
    const mediaChunk = formatChunk(content);
    if (mediaChunk) {
      return (
        <>
          <span className="text-tg-text-secondary">{sender}: </span>
          {mediaChunk}
        </>
      );
    }
  }

  return (
    <span className={unreadCount > 0 ? 'text-tg-text font-medium' : 'text-tg-text-secondary'}>
      {text}
    </span>
  );
}

function DialogRow({
  dialog,
  isSaved = false,
  editMode = false,
  selected = false,
  onClick,
  onPrefetch,
  onLongPress,
}: {
  dialog: RealDialogItem;
  isSaved?: boolean;
  editMode?: boolean;
  selected?: boolean;
  onClick: () => void;
  onPrefetch?: () => void;
  onLongPress: () => void;
}) {
  const time = formatDialogTime(dialog.lastMessageDate);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayTitle = isSaved ? 'Saved Messages' : dialog.title;
  return (
    <button
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
      onTouchStart={() => { onPrefetch?.(); timerRef.current = setTimeout(onLongPress, 450); }}
      onTouchEnd={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
      onTouchMove={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
      className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-tg-surface/60 transition-colors relative text-left"
    >
      {editMode && (
        <div
          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
            selected ? 'bg-tg-blue border-tg-blue text-white' : 'border-tg-text-hint'
          }`}
        >
          {selected && <Check className="w-3 h-3" />}
        </div>
      )}

      <Avatar
        letters={dialog.avatarLetters}
        color={dialog.avatarColor}
        online={dialog.isOnline}
        isSavedMessages={isSaved}
        size="lg"
        peerType={dialog.peerType}
        peerId={dialog.peerId}
        accessHash={dialog.accessHash}
        hasPhoto={dialog.hasPhoto}
        photoId={dialog.photoId}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-tg-text font-semibold truncate text-[15px] leading-snug">{displayTitle}</span>
            {dialog.isMuted && (
              <VolumeX className="w-3.5 h-3.5 text-tg-text-hint shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {dialog.lastMessageOut && (
              dialog.lastMessageRead ? (
                <TelegramTicks variant="double" className="w-4 h-3 text-tg-green shrink-0" />
              ) : (
                <TelegramTicks variant="single" className="w-3.5 h-3 text-tg-text-hint shrink-0" />
              )
            )}
            <span suppressHydrationWarning className="text-tg-text-hint text-xs">{time}</span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-2">
          <p className="text-tg-text-secondary text-[13.5px] leading-snug line-clamp-2 flex-1 text-left">
            <DialogMediaBadge media={dialog.lastMessageMedia} lastMessage={dialog.lastMessage} />
            {renderDialogLastMessage(dialog.lastMessage, dialog.unreadCount)}
          </p>
          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            {dialog.unreadCount > 0 ? (
              <Badge count={dialog.unreadCount} muted={dialog.isMuted} />
            ) : dialog.isPinned ? (
              <Pin className="w-3.5 h-3.5 text-tg-text-hint rotate-45" />
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}
