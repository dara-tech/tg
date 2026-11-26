'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Ban,
  Bell,
  BellOff,
  ChevronLeft,
  ExternalLink,
  FileText,
  Link2,
  MessageSquare,
  MessageSquareX,
  Mic,
  MoreHorizontal,
  Phone,
  Play,
  QrCode,
  Search,
  Share2,
  Video,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import { MediaViewer } from '@/features/media/MediaViewer';
import { useDialogsStore } from '@/store/dialogs.store';
import { useUIStore } from '@/store/ui.store';
import {
  blockRealUser,
  clearRealHistory,
  downloadMediaUrl,
  downloadPeerAvatarUrl,
  fetchCommonGroups,
  fetchRealProfile,
  fetchSharedMedia,
  fetchUserProfilePhotos,
  getPeerAccessHash,
  isMTProtoConfigured,
  toggleMuteRealChat,
  updateRealProfile,
  type CommonGroupItem,
  type MediaAttachment,
  type RealMessageItem,
} from '@/services/telegram.real';
import clsx from 'clsx';

interface ProfileData {
  id: number;
  accessHash?: string;
  name: string;
  username: string;
  phone: string;
  bio: string;
  birthday?: string;
  online: boolean;
  color: string;
  letters: string;
  hasPhoto?: boolean;
  photoId?: string;
}

type ProfileTab = 'media' | 'files' | 'voice' | 'links' | 'groups';

function SharedMediaThumb({
  item,
  onOpen,
}: {
  item: RealMessageItem;
  onOpen: (src: string, type: 'image' | 'video') => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!item.media) return;
    let active = true;
    downloadMediaUrl(item.media).then((u) => {
      if (active && u) setUrl(u);
    });
    return () => { active = false; };
  }, [item.media]);

  const isVideo = item.media?.kind === 'video';

  return (
    <button
      onClick={() => url && onOpen(url, isVideo ? 'video' : 'image')}
      className="relative aspect-square bg-tg-bg-secondary overflow-hidden flex items-center justify-center group"
    >
      {url ? (
        isVideo ? (
          <video src={url} className="w-full h-full object-cover" />
        ) : (
          <img src={url} alt="" className="w-full h-full object-cover group-active:scale-95 transition-transform" />
        )
      ) : (
        <div className="w-full h-full bg-tg-surface animate-pulse" />
      )}
      {isVideo && (
        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium flex items-center gap-0.5">
          <Play className="w-2.5 h-2.5 fill-current" />
          {item.media?.duration
            ? `${Math.floor(item.media.duration / 60)}:${String(Math.floor(item.media.duration % 60)).padStart(2, '0')}`
            : 'Video'}
        </span>
      )}
    </button>
  );
}

function SharedVoiceRow({ item }: { item: RealMessageItem }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dur = item.media?.duration
    ? `${Math.floor(item.media.duration / 60)}:${String(Math.floor(item.media.duration % 60)).padStart(2, '0')}`
    : 'Voice note';

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <button
        onClick={async () => {
          if (url || !item.media) return;
          setLoading(true);
          const u = await downloadMediaUrl(item.media);
          setLoading(false);
          if (u) setUrl(u);
          else toast('Could not load voice note', 'error');
        }}
        className="w-9 h-9 rounded-full bg-tg-blue/15 text-tg-blue flex items-center justify-center shrink-0"
      >
        {loading ? <Spinner /> : <Mic className="w-4 h-4" />}
      </button>
      <div className="flex-1 min-w-0">
        {url ? (
          <audio src={url} controls autoPlay className="w-full h-8" />
        ) : (
          <>
            <p className="text-tg-text text-sm font-medium">{dur}</p>
            <p className="text-tg-text-hint text-xs">
              {new Date(item.date * 1000).toLocaleDateString()} · Tap to play
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProfileScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { setActiveCall } = useUIStore();
  const dialogs = useDialogsStore((s) => s.dialogs);
  const updateDialogMeta = useDialogsStore((s) => s.updateDialogMeta);

  const matchedDialog = useMemo(
    () => dialogs.find((d) => String(d.peerId) === id || d.id === id),
    [dialogs, id]
  );

  const peerType = matchedDialog?.peerType ?? 'user';
  const chatId = matchedDialog?.id ?? (id === 'me' ? 'me' : `u_${id}`);
  const resolvedAccessHash = matchedDialog?.accessHash || (id ? getPeerAccessHash(id) : '0');

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(Boolean(matchedDialog?.isMuted));
  const [blocked, setBlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('media');
  const [tabItems, setTabItems] = useState<RealMessageItem[]>([]);
  const [commonGroups, setCommonGroups] = useState<CommonGroupItem[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<{ src: string; type: 'image' | 'video' } | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  // Expanded full-photo hero gallery state
  const [heroPhotos, setHeroPhotos] = useState<MediaAttachment[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  useEffect(() => {
    setMuted(Boolean(matchedDialog?.isMuted));
  }, [matchedDialog?.isMuted]);

  useEffect(() => {
    if (!isMTProtoConfigured() || !id) {
      setLoading(false);
      return;
    }
    if (peerType !== 'user' && id !== 'me') {
      setLoading(false);
      return;
    }
    fetchRealProfile(id, resolvedAccessHash)
      .then((p) => {
        setProfile(p);
        setEditName(p.name);
        setEditBio(p.bio);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, peerType, resolvedAccessHash]);

  const display: ProfileData = profile ?? {
    id: matchedDialog?.peerId ?? (Number(id) || 0),
    accessHash: resolvedAccessHash,
    name: matchedDialog?.title ?? (id === 'me' ? 'My Account' : `User ${id}`),
    username: '',
    phone: '',
    bio: '',
    birthday: '',
    online: Boolean(matchedDialog?.isOnline),
    color: matchedDialog?.avatarColor ?? '#2563EB',
    letters: matchedDialog?.avatarLetters ?? (id === 'me' ? 'ME' : 'U'),
    hasPhoto: matchedDialog?.hasPhoto,
    photoId: matchedDialog?.photoId,
  };

  // Load full-res hero photos for user/chat
  useEffect(() => {
    if (!isMTProtoConfigured() || !display.id) return;
    let active = true;
    if (peerType === 'user') {
      fetchUserProfilePhotos(display.id, display.accessHash || '0', 8).then((list) => {
        if (!active) return;
        if (list.length > 0) {
          setHeroPhotos(list);
          setHeroIdx(0);
        }
      });
    }
    return () => { active = false; };
  }, [display.id, display.accessHash, peerType]);

  // Download active hero photo URL (with big peer avatar fallback)
  useEffect(() => {
    if (!isMTProtoConfigured() || !display.id) return;
    let active = true;
    const current = heroPhotos[heroIdx];
    if (current) {
      downloadMediaUrl(current).then((u) => {
        if (active && u) setHeroUrl(u);
      });
    } else if (display.hasPhoto && display.photoId) {
      downloadPeerAvatarUrl(peerType, display.id, display.accessHash || '0', display.photoId, true).then((u) => {
        if (active && u) setHeroUrl(u);
      });
    } else {
      setHeroUrl(null);
    }
    return () => { active = false; };
  }, [heroPhotos, heroIdx, display.id, display.hasPhoto, display.photoId, display.accessHash, peerType]);

  useEffect(() => {
    if (!isMTProtoConfigured() || !id || id === 'me') return;
    let cancelled = false;
    setTabLoading(true);

    if (activeTab === 'groups') {
      if (peerType !== 'user') {
        setCommonGroups([]);
        setTabLoading(false);
        return;
      }
      fetchCommonGroups(id, resolvedAccessHash)
        .then((g) => { if (!cancelled) setCommonGroups(g); })
        .catch(() => { if (!cancelled) setCommonGroups([]); })
        .finally(() => { if (!cancelled) setTabLoading(false); });
    } else {
      fetchSharedMedia(chatId, activeTab, resolvedAccessHash)
        .then((items) => { if (!cancelled) setTabItems(items); })
        .catch(() => { if (!cancelled) setTabItems([]); })
        .finally(() => { if (!cancelled) setTabLoading(false); });
    }

    return () => { cancelled = true; };
  }, [activeTab, chatId, id, peerType, resolvedAccessHash]);

  const handleToggleMute = async () => {
    const next = !muted;
    setMuted(next);
    if (matchedDialog) updateDialogMeta(matchedDialog.id, { isMuted: next });
    if (isMTProtoConfigured()) {
      await toggleMuteRealChat(chatId, next, resolvedAccessHash).catch(() => {});
    }
    toast(next ? 'Notifications muted' : 'Notifications unmuted', 'info');
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    if (id === 'me' && isMTProtoConfigured()) {
      try {
        const [first, ...rest] = editName.trim().split(' ');
        await updateRealProfile(first || '', rest.join(' '), editBio);
        setProfile((p) => (p ? { ...p, name: editName.trim(), bio: editBio } : p));
        toast('Profile updated', 'success');
      } catch (e: unknown) {
        const err = e as { error_message?: string; message?: string };
        toast(err?.error_message || err?.message || 'Update failed', 'error');
      }
    } else {
      setProfile((p) => (p ? { ...p, name: editName.trim(), bio: editBio } : p));
      toast('Updated', 'success');
    }
    setSaving(false);
    setEditOpen(false);
  };

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'media', label: 'Media' },
    { id: 'files', label: 'Files' },
    { id: 'voice', label: 'Voice' },
    { id: 'links', label: 'Links' },
    ...(peerType === 'user' && id !== 'me' ? [{ id: 'groups' as const, label: 'Groups' }] : []),
  ];

  const hasHeroImage = Boolean(heroUrl);

  const actionButtons = id !== 'me' && (
    <div className="grid grid-cols-5 gap-2">
      <button
        onClick={() => setActiveCall(display.id || 1, display.name)}
        className={clsx(
          'rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform',
          hasHeroImage
            ? 'bg-white/15 backdrop-blur-md border border-white/20 text-white'
            : 'bg-tg-bg-secondary border border-tg-border text-tg-blue'
        )}
      >
        <Phone className="w-[18px] h-[18px]" />
        <span className="text-[11px] font-medium">call</span>
      </button>
      <button
        onClick={() => {
          setActiveCall(display.id || 1, display.name);
          toast('Starting video call…', 'info');
        }}
        className={clsx(
          'rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform',
          hasHeroImage
            ? 'bg-white/15 backdrop-blur-md border border-white/20 text-white'
            : 'bg-tg-bg-secondary border border-tg-border text-tg-blue'
        )}
      >
        <Video className="w-[18px] h-[18px]" />
        <span className="text-[11px] font-medium">video</span>
      </button>
      <button
        onClick={handleToggleMute}
        className={clsx(
          'rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform',
          hasHeroImage
            ? 'bg-white/15 backdrop-blur-md border border-white/20 text-white'
            : 'bg-tg-bg-secondary border border-tg-border text-tg-blue'
        )}
      >
        {muted ? <BellOff className="w-[18px] h-[18px]" /> : <Bell className="w-[18px] h-[18px]" />}
        <span className="text-[11px] font-medium">{muted ? 'unmute' : 'mute'}</span>
      </button>
      <button
        onClick={() => router.push(`/chat/${chatId}?search=1`)}
        className={clsx(
          'rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform',
          hasHeroImage
            ? 'bg-white/15 backdrop-blur-md border border-white/20 text-white'
            : 'bg-tg-bg-secondary border border-tg-border text-tg-blue'
        )}
      >
        <Search className="w-[18px] h-[18px]" />
        <span className="text-[11px] font-medium">search</span>
      </button>
      <button
        onClick={() => setMoreOpen((v) => !v)}
        className={clsx(
          'rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform',
          hasHeroImage
            ? 'bg-white/15 backdrop-blur-md border border-white/20 text-white'
            : 'bg-tg-bg-secondary border border-tg-border text-tg-blue'
        )}
      >
        <MoreHorizontal className="w-[18px] h-[18px]" />
        <span className="text-[11px] font-medium">more</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-tg-bg-tertiary relative">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-8">
        {hasHeroImage ? (
          /* ── Full-Bleed Photo Hero (matches iOS Telegram expanded profile) ── */
          <div className="relative w-full h-[380px] bg-black select-none overflow-hidden">
            <img src={heroUrl!} alt={display.name} className="w-full h-full object-cover" />

            {/* Tap left/right to cycle profile photos */}
            {heroPhotos.length > 1 && (
              <div className="absolute inset-0 flex z-10">
                <div
                  className="w-1/3 h-full"
                  onClick={() => setHeroIdx((i) => (i - 1 + heroPhotos.length) % heroPhotos.length)}
                />
                <div
                  className="w-1/3 h-full"
                  onClick={() => heroUrl && setMediaViewer({ src: heroUrl, type: 'image' })}
                />
                <div
                  className="w-1/3 h-full"
                  onClick={() => setHeroIdx((i) => (i + 1) % heroPhotos.length)}
                />
              </div>
            )}

            {/* Top gradient + progress bars + Back/Edit buttons */}
            <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/55 to-transparent px-4 pt-3 pb-6 safe-top z-20 pointer-events-none">
              {heroPhotos.length > 1 && (
                <div className="flex gap-1 mb-2.5">
                  {heroPhotos.map((ph, i) => (
                    <div key={ph.id} className="h-[2.5px] flex-1 rounded-full bg-white/30 overflow-hidden">
                      <div className={clsx('h-full bg-white transition-all', i === heroIdx ? 'w-full' : 'w-0')} />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pointer-events-auto">
                <button
                  onClick={() => router.back()}
                  className="w-9 h-9 rounded-full bg-black/35 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setEditName(display.name);
                    setEditBio(display.bio);
                    setEditOpen(true);
                  }}
                  className="px-4 h-9 rounded-full bg-black/35 backdrop-blur-md border border-white/20 text-sm font-medium text-white active:scale-95 transition-transform"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Bottom dark gradient + Name + 5 Glass Action Buttons */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pt-12 pb-4 z-20 space-y-3">
              <div>
                <h1 className="text-white text-2xl font-bold tracking-tight leading-tight drop-shadow-sm">
                  {display.name}
                </h1>
                <p className={clsx('text-sm mt-0.5', display.online ? 'text-sky-300 font-medium' : 'text-white/80')}>
                  {display.online
                    ? 'online'
                    : peerType === 'channel'
                    ? 'channel'
                    : peerType === 'chat'
                    ? 'group'
                    : 'last seen recently'}
                </p>
              </div>
              {actionButtons}
            </div>
          </div>
        ) : (
          /* ── Compact Centered Avatar Hero (fallback when no profile photo) ── */
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-2 safe-top">
              <button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-full bg-tg-bg-secondary border border-tg-border flex items-center justify-center text-tg-text active:scale-95 transition-transform"
                aria-label="Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setEditName(display.name);
                  setEditBio(display.bio);
                  setEditOpen(true);
                }}
                className="px-4 h-9 rounded-full bg-tg-bg-secondary border border-tg-border text-sm font-medium text-tg-text active:scale-95 transition-transform"
              >
                Edit
              </button>
            </div>
            <div className="flex flex-col items-center text-center px-4 pt-1 pb-4">
              <Avatar
                letters={display.letters}
                color={display.color}
                size="xl"
                online={display.online}
                peerType={peerType}
                peerId={display.id || undefined}
                accessHash={display.accessHash}
                hasPhoto={display.hasPhoto}
                photoId={display.photoId}
              />
              <h1 className="text-tg-text text-2xl font-bold tracking-tight mt-3">{display.name}</h1>
              <span className={clsx('text-sm mt-0.5', display.online ? 'text-tg-blue font-medium' : 'text-tg-text-secondary')}>
                {display.online
                  ? 'online'
                  : peerType === 'channel'
                  ? 'channel'
                  : peerType === 'chat'
                  ? 'group'
                  : 'last seen recently'}
              </span>
            </div>
            {id !== 'me' && <div className="px-4 mb-4">{actionButtons}</div>}
          </div>
        )}

        {/* Body Content */}
        <div className="px-4 pt-4">
          {loading && !profile && (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          )}

          {(display.phone || display.username || display.birthday || display.bio) && (
            <div className="bg-tg-bg-secondary border border-tg-border rounded-2xl divide-y divide-tg-border overflow-hidden mb-4">
              {display.phone && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(display.phone);
                    toast('Phone copied', 'success');
                  }}
                  className="w-full px-4 py-3 text-left active:bg-tg-surface transition-colors"
                >
                  <p className="text-tg-text-secondary text-xs mb-0.5">mobile</p>
                  <p className="text-tg-blue text-sm font-medium">{display.phone}</p>
                </button>
              )}
              {display.username && (
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(display.username);
                      toast('Username copied', 'success');
                    }}
                    className="text-left flex-1 min-w-0"
                  >
                    <p className="text-tg-text-secondary text-xs mb-0.5">username</p>
                    <p className="text-tg-blue text-sm font-medium truncate">{display.username}</p>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://t.me/${display.username.replace(/^@/, '')}`);
                      toast('Profile link copied', 'success');
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-tg-blue active:bg-tg-surface shrink-0"
                    aria-label="Share profile link"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              )}
              {display.birthday && (
                <div className="px-4 py-3">
                  <p className="text-tg-text-secondary text-xs mb-0.5">birthday</p>
                  <p className="text-tg-text text-sm">{display.birthday}</p>
                </div>
              )}
              {display.bio && (
                <div className="px-4 py-3">
                  <p className="text-tg-text-secondary text-xs mb-0.5">bio</p>
                  <p className="text-tg-text text-sm whitespace-pre-wrap break-words">{display.bio}</p>
                </div>
              )}
            </div>
          )}

          {/* Segmented Tabs + Content */}
          {id !== 'me' && (
            <>
              <div className="bg-tg-bg-secondary border border-tg-border rounded-full p-1 flex items-center">
                {tabs.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={clsx(
                        'flex-1 py-1.5 rounded-full text-xs transition-colors',
                        active
                          ? 'bg-tg-surface text-tg-text font-semibold'
                          : 'text-tg-text-secondary font-medium'
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                {tabLoading ? (
                  <div className="flex justify-center py-10">
                    <Spinner />
                  </div>
                ) : activeTab === 'media' ? (
                  tabItems.length === 0 ? (
                    <p className="text-tg-text-hint text-xs text-center py-10">No shared media</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden border border-tg-border">
                      {tabItems.map((item) => (
                        <SharedMediaThumb
                          key={item.id}
                          item={item}
                          onOpen={(src, type) => setMediaViewer({ src, type })}
                        />
                      ))}
                    </div>
                  )
                ) : activeTab === 'files' ? (
                  tabItems.length === 0 ? (
                    <p className="text-tg-text-hint text-xs text-center py-10">No shared files</p>
                  ) : (
                    <div className="bg-tg-bg-secondary border border-tg-border rounded-2xl divide-y divide-tg-border overflow-hidden">
                      {tabItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={async () => {
                            if (!item.media) return;
                            const url = await downloadMediaUrl(item.media);
                            if (!url) { toast('Failed to download file', 'error'); return; }
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = item.media.fileName || 'file';
                            a.click();
                          }}
                          className="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-tg-surface"
                        >
                          <div className="w-9 h-9 rounded-xl bg-tg-blue/15 text-tg-blue flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-tg-text text-sm font-medium truncate">
                              {item.media?.fileName || 'File'}
                            </p>
                            <p className="text-tg-text-hint text-xs">
                              {item.media?.size
                                ? `${item.media.size >= 1024 * 1024
                                    ? `${(item.media.size / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`
                                    : `${(item.media.size / 1024).toFixed(1).replace(/\.0$/, '')} KB`} · `
                                : ''}
                              {new Date(item.date * 1000).toLocaleDateString()}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                ) : activeTab === 'voice' ? (
                  tabItems.length === 0 ? (
                    <p className="text-tg-text-hint text-xs text-center py-10">No voice messages</p>
                  ) : (
                    <div className="bg-tg-bg-secondary border border-tg-border rounded-2xl divide-y divide-tg-border overflow-hidden">
                      {tabItems.map((item) => (
                        <SharedVoiceRow key={item.id} item={item} />
                      ))}
                    </div>
                  )
                ) : activeTab === 'links' ? (
                  tabItems.length === 0 ? (
                    <p className="text-tg-text-hint text-xs text-center py-10">No shared links</p>
                  ) : (
                    <div className="bg-tg-bg-secondary border border-tg-border rounded-2xl divide-y divide-tg-border overflow-hidden">
                      {tabItems.map((item) => {
                        const match = item.text.match(/https?:\/\/[^\s]+/);
                        const href = match?.[0];
                        return (
                          <a
                            key={item.id}
                            href={href || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-3 flex items-center gap-3 active:bg-tg-surface"
                          >
                            <div className="w-9 h-9 rounded-xl bg-tg-blue/15 text-tg-blue flex items-center justify-center shrink-0">
                              <ExternalLink className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-tg-blue text-sm font-medium truncate">{href || item.text}</p>
                              <p className="text-tg-text-hint text-xs truncate">{item.text}</p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )
                ) : commonGroups.length === 0 ? (
                  <p className="text-tg-text-hint text-xs text-center py-10">No groups in common</p>
                ) : (
                  <div className="bg-tg-bg-secondary border border-tg-border rounded-2xl divide-y divide-tg-border overflow-hidden">
                    {commonGroups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => router.push(`/chat/${g.id}`)}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-tg-surface"
                      >
                        <Avatar
                          letters={g.letters}
                          color={g.color}
                          size="sm"
                          peerType={g.peerType}
                          peerId={g.peerId}
                          accessHash={g.accessHash}
                          hasPhoto={g.hasPhoto}
                          photoId={g.photoId}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-tg-text text-sm font-medium truncate">{g.title}</p>
                          {g.membersCount !== undefined && (
                            <p className="text-tg-text-hint text-xs">{g.membersCount} members</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating More Actions Popover (matches iOS screenshot) */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={clsx(
              'absolute right-4 w-[235px] bg-tg-bg-secondary/95 backdrop-blur-xl border border-tg-border rounded-2xl shadow-2xl overflow-hidden',
              hasHeroImage ? 'top-[372px]' : 'top-[290px]'
            )}
          >
            <div className="divide-y divide-tg-border/50">
              <button
                onClick={() => { setMoreOpen(false); router.push(`/chat/${chatId}`); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-tg-text active:bg-tg-surface text-left"
              >
                <MessageSquare className="w-4 h-4 text-tg-text-secondary" />
                <span>Send Message</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    display.username ? `https://t.me/${display.username.replace(/^@/, '')}` : display.phone || display.name
                  );
                  toast('Contact copied', 'success');
                  setMoreOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-tg-text active:bg-tg-surface text-left"
              >
                <Share2 className="w-4 h-4 text-tg-text-secondary" />
                <span>Share Contact</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    display.username ? `https://t.me/${display.username.replace(/^@/, '')}` : `tg://user?id=${display.id}`
                  );
                  toast('Link copied', 'success');
                  setMoreOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-tg-text active:bg-tg-surface text-left"
              >
                <Link2 className="w-4 h-4 text-tg-text-secondary" />
                <span>Copy Link</span>
              </button>
            </div>

            <div className="h-1.5 bg-tg-surface/80" />

            <div className="divide-y divide-tg-border/50">
              <button
                onClick={async () => {
                  setMoreOpen(false);
                  if (isMTProtoConfigured()) {
                    await clearRealHistory(chatId, display.accessHash || '0').catch(() => {});
                  }
                  toast('Messages cleared', 'info');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-tg-text active:bg-tg-surface text-left"
              >
                <MessageSquareX className="w-4 h-4 text-tg-text-secondary" />
                <span>Clear Messages</span>
              </button>
              {peerType === 'user' && (
                <button
                  onClick={async () => {
                    const next = !blocked;
                    setBlocked(next);
                    setMoreOpen(false);
                    if (isMTProtoConfigured() && display.id) {
                      await blockRealUser(display.id, display.accessHash || '0', next).catch(() => {});
                    }
                    toast(next ? 'User blocked' : 'User unblocked', 'info');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-500 active:bg-rose-500/10 text-left"
                >
                  <Ban className="w-4 h-4" />
                  <span>{blocked ? 'Unblock User' : 'Block User'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title={id === 'me' ? 'Edit Profile' : 'Edit Contact'}>
        <div className="px-4 pb-6 space-y-3">
          <Input label="Display Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          {id === 'me' && <Input label="Bio" value={editBio} onChange={(e) => setEditBio(e.target.value)} />}
          <Button loading={saving} onClick={handleSaveEdit}>Save</Button>
        </div>
      </BottomSheet>

      {mediaViewer && (
        <MediaViewer
          src={mediaViewer.src}
          type={mediaViewer.type}
          onClose={() => setMediaViewer(null)}
        />
      )}
    </div>
  );
}