'use client';
import { useState, useEffect, useRef } from 'react';
import { BadgeCheck, Image as ImageIcon, Plus, Send, Trash2, Type, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { downloadMediaUrl, fetchStoryMediaUrl, markStoryReadReal, sendRealTextMessage, isMTProtoConfigured, type RealStoryItem } from '@/services/telegram.real';

interface MyProfileSummary {
  id?: number;
  accessHash?: string;
  name: string;
  letters: string;
  color: string;
  hasPhoto?: boolean;
  photoId?: string;
}

const STORY_GRADIENTS = [
  'linear-gradient(160deg, #2563EB, #06B6D4)',
  'linear-gradient(160deg, #7C3AED, #EC4899)',
  'linear-gradient(160deg, #059669, #10B981)',
  'linear-gradient(160deg, #EA580C, #F59E0B)',
  'linear-gradient(160deg, #0F172A, #334155)',
];

function formatStoryAgo(ts: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return '1d ago';
}

export function StoriesRow({
  stories,
  myStories = [],
  myProfile,
  composerOpen,
  onOpenComposer,
  onCloseComposer,
  onCreateStory,
  onDeleteMyStory,
}: {
  stories: RealStoryItem[];
  myStories?: RealStoryItem[];
  myProfile?: MyProfileSummary;
  composerOpen: boolean;
  onOpenComposer: () => void;
  onCloseComposer: () => void;
  onCreateStory: (story: RealStoryItem) => void;
  onDeleteMyStory?: (id: number) => void;
}) {
  const [viewerList, setViewerList] = useState<RealStoryItem[] | null>(null);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [progress, setProgress] = useState(0);

  // Composer state
  const [mode, setMode] = useState<'text' | 'media'>('text');
  const [storyText, setStoryText] = useState('');
  const [gradIdx, setGradIdx] = useState(0);
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  const [pickedType, setPickedType] = useState<'image' | 'video'>('image');
  const fileRef = useRef<HTMLInputElement>(null);

  const active = viewerList ? viewerList[activeIdx] ?? null : null;

  // Load remote GramJS / MTProto story media if needed
  useEffect(() => {
    if (!active) {
      setMediaUrl(null);
      return;
    }
    if (active.localMediaUrl) {
      setMediaUrl(active.localMediaUrl);
      return;
    }
    let ok = true;
    setMediaUrl(null);
    if (active.media) {
      downloadMediaUrl(active.media).then((u) => {
        if (ok && u) setMediaUrl(u);
      });
    } else if (!active.isMine) {
      fetchStoryMediaUrl(active).then((u) => {
        if (ok && u) setMediaUrl(u);
      });
    }
    return () => { ok = false; };
  }, [active]);

  // Auto-advance timer (5 seconds per story)
  useEffect(() => {
    if (!viewerList || !active) return;
    setProgress(0);
    const start = Date.now();
    const duration = 5000;
    const iv = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(iv);
        if (activeIdx + 1 < viewerList.length) {
          const next = activeIdx + 1;
          setActiveIdx(next);
          setSeenIds((prev) => new Set(prev).add(viewerList[next].id));
        } else {
          setViewerList(null);
        }
      }
    }, 50);
    return () => clearInterval(iv);
  }, [viewerList, active, activeIdx]);

  const openViewer = (list: RealStoryItem[], startIdx: number) => {
    setViewerList(list);
    setActiveIdx(startIdx);
    const target = list[startIdx];
    setSeenIds((prev) => new Set(prev).add(target.id));
    markStoryReadReal(target).catch(() => {});
  };

  const stepViewer = (dir: 1 | -1) => {
    if (!viewerList) return;
    const next = activeIdx + dir;
    if (next >= 0 && next < viewerList.length) {
      setActiveIdx(next);
      const target = viewerList[next];
      setSeenIds((prev) => new Set(prev).add(target.id));
      markStoryReadReal(target).catch(() => {});
    } else if (dir === 1) {
      setViewerList(null);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPickedUrl(String(reader.result));
      setPickedType(file.type.startsWith('video/') ? 'video' : 'image');
      setMode('media');
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = () => {
    if (mode === 'text' && !storyText.trim()) {
      toast('Write something for your story', 'error');
      return;
    }
    if (mode === 'media' && !pickedUrl) {
      toast('Choose a photo or video', 'error');
      return;
    }
    const newStory: RealStoryItem = {
      id: Date.now(),
      peerId: myProfile?.id,
      peerType: 'user',
      accessHash: myProfile?.accessHash,
      name: myProfile?.name || 'My Story',
      letters: myProfile?.letters || 'ME',
      color: STORY_GRADIENTS[gradIdx],
      hasPhoto: myProfile?.hasPhoto,
      photoId: myProfile?.photoId,
      seen: false,
      text: storyText.trim(),
      date: Math.floor(Date.now() / 1000),
      localMediaUrl: mode === 'media' ? pickedUrl ?? undefined : undefined,
      localMediaType: mode === 'media' ? pickedType : undefined,
      isMine: true,
    };
    onCreateStory(newStory);
    setStoryText('');
    setPickedUrl(null);
    setMode('text');
    onCloseComposer();
    toast('Story published', 'success');
  };

  const handleReply = async () => {
    if (!replyText.trim() || !active?.peerId) return;
    const msg = replyText.trim();
    setReplyText('');
    if (isMTProtoConfigured()) {
      const prefix = active.peerType === 'channel' ? 'c' : active.peerType === 'chat' ? 'g' : 'u';
      await sendRealTextMessage(`${prefix}_${active.peerId}`, msg, active.accessHash || '0').catch(() => {});
    }
    toast('Reply sent', 'success');
  };

  const hasMyStories = myStories.length > 0;

  return (
    <>
      <div className="flex gap-3.5 px-4 pt-1 pb-2.5 overflow-x-auto scrollbar-hide shrink-0">
        {/* My Story */}
        <div className="flex flex-col items-center gap-1 shrink-0 w-16">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (hasMyStories) openViewer(myStories, 0);
                else onOpenComposer();
              }}
              className="active:scale-95 transition-transform block"
            >
              <div
                className={`rounded-full p-[2.5px] ${
                  hasMyStories
                    ? 'bg-gradient-to-tr from-tg-blue via-sky-400 to-emerald-400'
                    : 'bg-transparent'
                }`}
              >
                <div className={hasMyStories ? 'rounded-full p-[2px] bg-tg-bg' : ''}>
                  <Avatar
                    letters={myProfile?.letters || 'ME'}
                    color={myProfile?.color || '#2563EB'}
                    size="lg"
                    peerType="user"
                    peerId={myProfile?.id}
                    accessHash={myProfile?.accessHash}
                    hasPhoto={myProfile?.hasPhoto}
                    photoId={myProfile?.photoId}
                  />
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={onOpenComposer}
              aria-label="Add story"
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-tg-blue text-white border-2 border-tg-bg flex items-center justify-center active:scale-90 transition-transform"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
          <span className="text-tg-text text-[11px] font-medium truncate w-full text-center">
            My Story
          </span>
        </div>

        {stories.map((s, idx) => {
          const isSeen = s.seen || seenIds.has(s.id);
          return (
            <button
              key={`${s.id}-${idx}`}
              type="button"
              onClick={() => openViewer(stories, idx)}
              className="flex flex-col items-center gap-1 shrink-0 active:scale-95 transition-transform w-16"
            >
              <div
                className={`rounded-full p-[2.5px] ${
                  isSeen
                    ? 'bg-tg-border'
                    : 'bg-gradient-to-tr from-tg-blue via-sky-400 to-emerald-400'
                }`}
              >
                <div className="rounded-full p-[2px] bg-tg-bg">
                  <Avatar
                    letters={s.letters || s.name[0]}
                    color={s.color}
                    size="lg"
                    peerType={s.peerType}
                    peerId={s.peerId}
                    accessHash={s.accessHash}
                    hasPhoto={s.hasPhoto}
                    photoId={s.photoId}
                  />
                </div>
              </div>
              <span className="text-tg-text text-[11px] font-medium flex items-center justify-center gap-0.5 w-full">
                <span className="truncate">{s.name}</span>
                {s.verified && <BadgeCheck className="w-3 h-3 text-tg-blue shrink-0" />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fullscreen Story Viewer */}
      {viewerList && active && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-between p-4 safe-top safe-bottom animate-fade-in bg-black"
          style={
            !mediaUrl
              ? { background: active.color.startsWith('linear-gradient') ? active.color : `linear-gradient(160deg, ${active.color}, #0E1621)` }
              : undefined
          }
        >
          {/* Media background if photo/video */}
          {mediaUrl && (
            active.localMediaType === 'video' || active.media?.kind === 'video' ? (
              <video
                src={mediaUrl}
                autoPlay
                playsInline
                loop
                className="absolute inset-0 w-full h-full object-contain bg-black"
              />
            ) : (
              <img
                src={mediaUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-contain bg-black"
              />
            )
          )}

          {/* Tap zones */}
          <div className="absolute inset-0 flex z-10">
            <div className="w-1/3 h-full" onClick={() => stepViewer(-1)} />
            <div className="w-2/3 h-full" onClick={() => stepViewer(1)} />
          </div>

          {/* Top Progress + Author */}
          <div className="relative z-20">
            <div className="flex gap-1 mb-3">
              {viewerList.map((s, i) => (
                <div key={s.id} className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
                  <div
                    className="h-full bg-white transition-[width] duration-75"
                    style={{
                      width: i < activeIdx ? '100%' : i === activeIdx ? `${progress}%` : '0%',
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar
                  letters={active.letters || active.name[0]}
                  color={active.color.startsWith('linear') ? '#2563EB' : active.color}
                  size="sm"
                  peerType={active.peerType}
                  peerId={active.peerId}
                  accessHash={active.accessHash}
                  hasPhoto={active.hasPhoto}
                  photoId={active.photoId}
                />
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">{active.name}</p>
                  <p className="text-white/70 text-[11px]">{formatStoryAgo(active.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {active.isMine && onDeleteMyStory && (
                  <button
                    onClick={() => {
                      const delId = active.id;
                      onDeleteMyStory(delId);
                      setViewerList(null);
                      toast('Story deleted', 'info');
                    }}
                    className="w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center"
                    aria-label="Delete story"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setViewerList(null)}
                  className="w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Center text for text-only stories or bottom caption */}
          {!mediaUrl ? (
            <div className="relative z-20 text-center px-4 pointer-events-none">
              <p className="text-white text-2xl font-bold drop-shadow whitespace-pre-wrap break-words">
                {active.text}
              </p>
            </div>
          ) : active.text ? (
            <div className="relative z-20 mt-auto mb-3 px-3 py-2 rounded-2xl bg-black/55 backdrop-blur-md text-white text-sm text-center pointer-events-none">
              {active.text}
            </div>
          ) : (
            <div />
          )}

          {/* Bottom Reply Bar */}
          {!active.isMine && active.peerId ? (
            <div className="relative z-20 flex items-center gap-2 pt-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleReply(); }}
                placeholder={`Reply to ${active.name}...`}
                className="flex-1 h-10 rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-4 text-sm text-white placeholder:text-white/60 focus:outline-none"
              />
              <button
                onClick={handleReply}
                className="w-10 h-10 rounded-full bg-tg-blue text-white flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative z-20 text-center text-white/60 text-xs">
              Tap left or right to navigate
            </div>
          )}
        </div>
      )}

      {/* Create Story BottomSheet */}
      <BottomSheet open={composerOpen} onClose={onCloseComposer} title="New Story">
        <div className="px-4 pb-6 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                mode === 'text' ? 'border-tg-blue bg-tg-blue/15 text-tg-blue' : 'border-tg-border text-tg-text-secondary'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Text</span>
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                mode === 'media' ? 'border-tg-blue bg-tg-blue/15 text-tg-blue' : 'border-tg-border text-tg-text-secondary'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photo / Video</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFilePick}
            />
          </div>

          {mode === 'text' ? (
            <>
              <div
                className="h-44 rounded-2xl p-4 flex items-center justify-center"
                style={{ background: STORY_GRADIENTS[gradIdx] }}
              >
                <textarea
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="Type your story..."
                  rows={3}
                  className="w-full bg-transparent text-white text-center text-lg font-bold placeholder:text-white/60 focus:outline-none resize-none"
                />
              </div>
              <div className="flex items-center justify-center gap-2.5">
                {STORY_GRADIENTS.map((g, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setGradIdx(i)}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      gradIdx === i ? 'ring-2 ring-tg-blue scale-110' : ''
                    }`}
                    style={{ background: g }}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {pickedUrl ? (
                <div className="relative h-56 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                  {pickedType === 'video' ? (
                    <video src={pickedUrl} controls className="w-full h-full object-contain" />
                  ) : (
                    <img src={pickedUrl} alt="" className="w-full h-full object-contain" />
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-44 rounded-2xl border border-dashed border-tg-border flex flex-col items-center justify-center gap-2 text-tg-text-secondary"
                >
                  <ImageIcon className="w-7 h-7" />
                  <span className="text-xs">Choose photo or video</span>
                </button>
              )}
              <input
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                placeholder="Add a caption..."
                className="w-full h-10 rounded-xl bg-tg-surface border border-tg-border px-3 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none"
              />
            </div>
          )}

          <Button onClick={handlePublish}>Post Story</Button>
        </div>
      </BottomSheet>
    </>
  );
}