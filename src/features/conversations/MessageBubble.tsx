'use client';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Edit3,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Forward,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Pause,
  Pin,
  Play,
  Reply,
  Trash2,
} from 'lucide-react';
import { Bubble, BubbleContent, BubbleReactions } from '@/components/ui/bubble';
import { TelegramTicks } from '@/components/ui/TelegramTicks';
import { Avatar } from '@/components/ui/Avatar';
import { toast } from '@/components/ui/Toast';
import { downloadMediaUrl, type MediaAttachment, type MessageSenderInfo, type ReactionItem, type TextEntity } from '@/services/telegram.real';
import { getCartoTileUrl, latLngToTile } from '@/lib/mapTiles';
import { BG_THEMES, useUIStore } from '@/store/ui.store';
import clsx from 'clsx';

interface Msg {
  id: number;
  text: string;
  out: boolean;
  date: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: number;
  reactions?: ReactionItem[];
  media?: MediaAttachment;
  groupedId?: string;
  albumMedia?: Array<{ id: number; media: MediaAttachment }>;
  entities?: TextEntity[];
  edited?: boolean;
  isService?: boolean;
  forwardedFrom?: { name: string; chatId?: string };
  sender?: MessageSenderInfo;
}

interface ContextMenuProps {
  isOut: boolean;
  time: string;
  status?: string;
  previewText: string;
  statusText: string;
  onReact:   (emoji: string) => void;
  onReply:   () => void;
  onEdit?:   () => void;
  onPin:     () => void;
  onCopy:    () => void;
  onForward: () => void;
  onDelete:  () => void;
  onSelect:  () => void;
  onClose:   () => void;
}

function ContextMenu({
  isOut, time, status, previewText, statusText, onReact, onReply, onEdit, onPin, onCopy, onForward, onDelete, onSelect, onClose,
}: ContextMenuProps) {
  const REACTIONS = ['👍', '❤️', '🔥', '🥰', '👏', '😁', '😭', '🙏'];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md animate-fade-in flex flex-col justify-center px-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={clsx(
          'w-full max-w-[420px] mx-auto flex flex-col gap-2.5 pointer-events-none',
          isOut ? 'items-end' : 'items-start'
        )}
      >
        {/* Reaction pill bar above the message */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto bg-tg-bg-secondary/95 backdrop-blur-xl border border-tg-border rounded-full px-2.5 py-1.5 flex items-center gap-0.5 max-w-full overflow-x-auto scrollbar-hide"
        >
          {REACTIONS.map(r => (
            <button
              key={r}
              onClick={() => { onReact(r); onClose(); }}
              className="w-8 h-8 flex items-center justify-center text-lg rounded-full active:scale-125 transition-transform shrink-0"
            >
              {r}
            </button>
          ))}
        </div>

        {/* Highlighted sharp message bubble in the middle */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={clsx(
            'pointer-events-auto max-w-[82%] rounded-2xl px-3.5 py-2 text-sm flex items-end gap-2',
            isOut
              ? 'chat-go-gradient text-white rounded-br-[4px]'
              : 'bg-tg-bg-secondary border border-tg-border text-tg-text rounded-bl-[4px]'
          )}
        >
          <span className="break-words whitespace-pre-wrap line-clamp-4">{previewText}</span>
          <span className={clsx('text-[10px] shrink-0 flex items-center gap-0.5 mb-0.5', isOut ? 'text-white/75' : 'text-tg-text-hint')}>
            <span>{time}</span>
            {isOut && <StatusTick status={status ?? 'sent'} />}
          </span>
        </div>

        {/* Context menu card below the message */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto bg-tg-bg-secondary/95 backdrop-blur-xl border border-tg-border rounded-2xl overflow-hidden w-[220px]"
        >
          <div className="px-4 py-2.5 border-b border-tg-border flex items-center gap-2 text-xs text-tg-text-secondary">
            <TelegramTicks variant="double" className="w-3.5 h-2.5 text-tg-blue shrink-0" />
            <span className="truncate">{statusText}</span>
          </div>
          <div className="divide-y divide-tg-border/50">
            {[
              { label: 'Reply',   icon: <Reply   className="w-4 h-4" />, action: onReply },
              { label: 'Copy',    icon: <Copy    className="w-4 h-4" />, action: onCopy },
              ...(isOut && onEdit ? [{ label: 'Edit', icon: <Edit3 className="w-4 h-4" />, action: onEdit }] : []),
              { label: 'Pin',     icon: <Pin     className="w-4 h-4" />, action: onPin },
              { label: 'Forward', icon: <Forward className="w-4 h-4" />, action: onForward },
              { label: 'Delete',  icon: <Trash2  className="w-4 h-4 text-rose-500" />, action: onDelete, danger: true },
              { label: 'Select',  icon: <CheckCircle2 className="w-4 h-4" />, action: onSelect },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => { item.action(); onClose(); }}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm active:bg-tg-surface text-left',
                  item.danger ? 'text-rose-500' : 'text-tg-text'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RichText({ text, entities, isOut }: { text: string; entities?: TextEntity[]; isOut: boolean }) {
  if (!text || typeof text !== 'string') return null;
  if (!entities?.length) {
    return <p className={clsx('text-sm leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap', isOut ? 'text-white' : 'text-tg-text')}>{text}</p>;
  }

  const sorted = [...entities].sort((a, b) => a.offset - b.offset);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((ent, i) => {
    if (ent.offset < cursor) return;
    if (ent.offset > cursor) parts.push(<span key={`t-${i}`}>{text.slice(cursor, ent.offset)}</span>);
    const slice = text.slice(ent.offset, ent.offset + ent.length);
    if (ent.type === 'bold') parts.push(<strong key={`e-${i}`} className="font-bold">{slice}</strong>);
    else if (ent.type === 'italic') parts.push(<em key={`e-${i}`} className="italic">{slice}</em>);
    else if (ent.type === 'code' || ent.type === 'pre') parts.push(<code key={`e-${i}`} className="font-mono text-xs bg-black/20 px-1.5 py-0.5 rounded">{slice}</code>);
    else if (ent.type === 'url' || ent.type === 'textUrl') {
      const href = ent.url || (slice.startsWith('http') ? slice : `https://${slice}`);
      parts.push(<a key={`e-${i}`} href={href} target="_blank" rel="noreferrer" className={clsx('underline', isOut ? 'text-sky-200' : 'text-tg-blue')}>{slice}</a>);
    } else if (ent.type === 'mention') {
      parts.push(<span key={`e-${i}`} className={clsx('font-medium', isOut ? 'text-sky-200' : 'text-tg-blue')}>{slice}</span>);
    } else {
      parts.push(<span key={`e-${i}`}>{slice}</span>);
    }
    cursor = ent.offset + ent.length;
  });

  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);

  return <p className={clsx('text-sm leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap', isOut ? 'text-white' : 'text-tg-text')}>{parts}</p>;
}

function formatMiddleTruncate(name: string, maxLen = 28): string {
  if (name.length <= maxLen) return name;
  const dotIdx = name.lastIndexOf('.');
  const ext = dotIdx > 0 && name.length - dotIdx <= 8 ? name.slice(dotIdx) : '';
  const tailLen = Math.max(6, ext.length + 5);
  const headLen = Math.max(8, maxLen - tailLen - 3);
  if (headLen + tailLen + 3 >= name.length) return name;
  return `${name.slice(0, headLen)}...${name.slice(-tailLen)}`;
}

function formatShortSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace(/\.00$/, '')} GB`;
}

function getFileMeta(fileName?: string, mimeType?: string) {
  const match = fileName?.match(/\.([a-zA-Z0-9]{1,6})$/);
  const ext = (match?.[1] || mimeType?.split('/')[1]?.split('+')[0] || 'FILE').toUpperCase();
  const lower = ext.toLowerCase();

  if (['sql', 'db', 'sqlite', 'sqlite3', 'psql'].includes(lower)) {
    return { ext, Icon: Database, badge: 'bg-indigo-500/20 text-indigo-500' };
  }
  if (['pdf'].includes(lower)) {
    return { ext, Icon: FileText, badge: 'bg-rose-500/20 text-rose-500' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(lower)) {
    return { ext, Icon: FileArchive, badge: 'bg-amber-500/20 text-amber-500' };
  }
  if (['xls', 'xlsx', 'csv', 'ods'].includes(lower)) {
    return { ext, Icon: FileSpreadsheet, badge: 'bg-emerald-500/20 text-emerald-500' };
  }
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'json', 'html', 'css', 'sh', 'xml', 'yaml', 'yml', 'go', 'rs', 'java', 'cpp', 'c', 'php'].includes(lower)) {
    return { ext, Icon: FileCode, badge: 'bg-sky-500/20 text-sky-500' };
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(lower)) {
    return { ext, Icon: FileAudio, badge: 'bg-purple-500/20 text-purple-500' };
  }
  if (['mp4', 'mov', 'mkv', 'webm', 'avi'].includes(lower)) {
    return { ext, Icon: FileVideo, badge: 'bg-orange-500/20 text-orange-500' };
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'heic'].includes(lower)) {
    return { ext, Icon: FileImage, badge: 'bg-pink-500/20 text-pink-500' };
  }
  return { ext, Icon: FileText, badge: 'bg-tg-blue/15 text-tg-blue' };
}

function decodeMtprotoWaveform(bytes: Uint8Array, count = 28): number[] {
  const totalBits = bytes.length * 8;
  const valuesCount = Math.floor(totalBits / 5);
  if (valuesCount === 0) return [];
  const rawValues: number[] = [];
  for (let i = 0; i < valuesCount; i++) {
    const bitOffset = i * 5;
    const byteOffset = Math.floor(bitOffset / 8);
    const bitInByte = bitOffset % 8;
    let val = (bytes[byteOffset] >> bitInByte) & 0x1f;
    if (bitInByte > 3 && byteOffset + 1 < bytes.length) {
      val |= (bytes[byteOffset + 1] << (8 - bitInByte)) & 0x1f;
    }
    rawValues.push(val);
  }
  const step = rawValues.length / count;
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.min(rawValues.length - 1, Math.floor(i * step));
    const normalized = (rawValues[idx] / 31) * 18 + 4;
    bars.push(Math.round(normalized));
  }
  return bars;
}

function generateWaveformBars(seedStr: string, count = 28): number[] {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const pseudo = Math.abs(Math.sin((i + 1) * 12.9898 + hash) * 43758.5453);
    const frac = pseudo - Math.floor(pseudo);
    const envelope = Math.sin(((i + 1) / (count + 1)) * Math.PI);
    const height = Math.round(4 + envelope * 12 + frac * 6);
    bars.push(Math.max(4, Math.min(22, height)));
  }
  return bars;
}

function VoicePlayer({
  media,
  time,
  isOut,
  status,
}: {
  media: MediaAttachment;
  time: string;
  isOut: boolean;
  status?: string;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(media.localUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media.duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const bars = useMemo(() => {
    if (media.waveform && media.waveform.length > 0) {
      const decoded = decodeMtprotoWaveform(media.waveform, 28);
      if (decoded.length > 0) return decoded;
    }
    return generateWaveformBars(`${media.id}-${media.duration || 0}`, 28);
  }, [media.id, media.duration, media.waveform]);

  useEffect(() => {
    if (media.localUrl) {
      setBlobUrl(media.localUrl);
    }
  }, [media.localUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [blobUrl]);

  const handleTogglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!blobUrl) {
      setLoading(true);
      const url = await downloadMediaUrl(media);
      setLoading(false);
      if (url) {
        setBlobUrl(url);
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(console.error);
          }
        }, 60);
      } else {
        toast('Could not download voice note', 'error');
      }
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const activeDur = duration || media.duration || 0;
    if (!waveformRef.current || !activeDur) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * activeDur;
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      if (!isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  };

  const activeDuration = duration || media.duration || 0;
  const currentSecs = isPlaying || currentTime > 0 ? currentTime : activeDuration;
  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 py-0.5 px-0.5 min-w-[210px] max-w-[260px] select-none">
      {blobUrl && <audio ref={audioRef} src={blobUrl} preload="metadata" />}
      <button
        type="button"
        onClick={handleTogglePlay}
        disabled={loading}
        className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 shadow-sm focus:outline-none',
          isOut
            ? 'bg-white text-tg-blue hover:bg-white/95'
            : 'bg-tg-blue text-white hover:bg-tg-blue/90'
        )}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        <div
          ref={waveformRef}
          onClick={handleWaveformClick}
          className="flex items-center gap-[2.5px] h-6 cursor-pointer group py-1"
        >
          {bars.map((h, i) => {
            const progress = activeDuration > 0 ? currentTime / activeDuration : 0;
            const isPlayed = i / bars.length <= progress;
            return (
              <div
                key={i}
                style={{ height: `${h}px` }}
                className={clsx(
                  'w-[2.5px] rounded-full transition-colors duration-100 shrink-0',
                  isOut
                    ? isPlayed
                      ? 'bg-white'
                      : 'bg-white/40 group-hover:bg-white/50'
                    : isPlayed
                    ? 'bg-tg-blue'
                    : 'bg-tg-text-hint/40 group-hover:bg-tg-text-hint/60'
                )}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] leading-tight select-none">
          <span className={clsx('font-medium tabular-nums', isOut ? 'text-white/85' : 'text-tg-text-secondary')}>
            {formatTimer(currentSecs)}
          </span>
          <div className="flex items-center gap-1">
            <span suppressHydrationWarning className={clsx('text-[10px]', isOut ? 'text-white/75' : 'text-tg-text-hint')}>
              {time}
            </span>
            {isOut && <StatusTick status={status ?? 'sent'} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlbumTile({
  media,
  onOpenMedia,
  onDimensions,
}: {
  media: MediaAttachment;
  onOpenMedia?: (src: string, type: 'image' | 'video') => void;
  onDimensions?: (w: number, h: number) => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(media.localUrl ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (media.localUrl) {
      setBlobUrl(media.localUrl);
      return;
    }
    if (media.kind === 'photo') {
      let cancelled = false;
      setLoading(true);
      downloadMediaUrl(media)
        .then((u) => {
          if (!cancelled) setBlobUrl(u);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [media]);

  const handleClick = async () => {
    if (media.kind === 'video') {
      if (blobUrl) {
        onOpenMedia?.(blobUrl, 'video');
        return;
      }
      setLoading(true);
      const url = await downloadMediaUrl(media);
      setLoading(false);
      if (url) {
        setBlobUrl(url);
        onOpenMedia?.(url, 'video');
      } else {
        toast('Could not download video', 'error');
      }
      return;
    }
    if (blobUrl) {
      onOpenMedia?.(blobUrl, 'image');
      return;
    }
    setLoading(true);
    const url = await downloadMediaUrl(media);
    setLoading(false);
    if (url) {
      setBlobUrl(url);
      onOpenMedia?.(url, 'image');
    } else {
      toast('Could not download photo', 'error');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative w-full h-full overflow-hidden bg-tg-surface focus:outline-none group block"
    >
      {media.kind === 'photo' && blobUrl ? (
        <img
          src={blobUrl}
          alt="Album photo"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              onDimensions?.(img.naturalWidth, img.naturalHeight);
            }
          }}
          className="w-full h-full object-cover transition-transform group-active:scale-[0.98]"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-tg-surface text-tg-text-hint">
          {media.kind === 'video' ? (
            <div className="w-10 h-10 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </div>
          ) : (
            <ImageIcon className="w-6 h-6 opacity-50" />
          )}
        </div>
      )}
    </button>
  );
}

function splitAlbumRows<T>(items: T[]): T[][] {
  const n = items.length;
  if (n <= 2) return [items];
  if (n === 3) return [items.slice(0, 1), items.slice(1, 3)];
  if (n === 4) return [items.slice(0, 2), items.slice(2, 4)];
  if (n === 5) return [items.slice(0, 2), items.slice(2, 5)];
  if (n === 6) return [items.slice(0, 3), items.slice(3, 6)];
  if (n === 7) return [items.slice(0, 2), items.slice(2, 4), items.slice(4, 7)];
  if (n === 8) return [items.slice(0, 2), items.slice(2, 5), items.slice(5, 8)];
  if (n === 9) return [items.slice(0, 3), items.slice(3, 6), items.slice(6, 9)];
  if (n === 10) return [items.slice(0, 2), items.slice(2, 4), items.slice(4, 7), items.slice(7, 10)];

  const rows: T[][] = [];
  let i = 0;
  while (i < n) {
    const rem = n - i;
    if (rem === 4 || rem === 2) {
      rows.push(items.slice(i, i + 2));
      i += 2;
    } else if (rem >= 3) {
      rows.push(items.slice(i, i + 3));
      i += 3;
    } else {
      rows.push(items.slice(i));
      break;
    }
  }
  return rows;
}

function AlbumGrid({
  items,
  time,
  isOut,
  status,
  hasCaption,
  hasHeader = false,
  onOpenMedia,
}: {
  items: Array<{ id: number; media: MediaAttachment }>;
  time: string;
  isOut: boolean;
  status?: string;
  hasCaption?: boolean;
  hasHeader?: boolean;
  onOpenMedia?: (src: string, type: 'image' | 'video') => void;
}) {
  const [dimsMap, setDimsMap] = useState<Record<number, { w: number; h: number }>>({});
  const rows = useMemo(() => splitAlbumRows(items), [items]);

  const getAspect = (item: { id: number; media: MediaAttachment }) => {
    const d = dimsMap[item.id];
    const w = d?.w ?? item.media.width;
    const h = d?.h ?? item.media.height;
    if (w && h && h > 0) return Math.max(0.55, Math.min(2.0, w / h));
    return 1;
  };

  return (
    <div
      className={clsx(
        'relative flex flex-col gap-[2px] overflow-hidden bg-tg-bg-secondary',
        hasCaption
          ? hasHeader
            ? 'w-full rounded-none'
            : 'w-full rounded-t-[18px]'
          : hasHeader
          ? 'w-[280px] sm:w-[320px] max-w-full rounded-b-[18px]'
          : 'w-[280px] sm:w-[320px] max-w-full rounded-[18px]'
      )}
    >
      {rows.map((row, rIdx) => {
        const totalAspect = row.reduce((sum, it) => sum + getAspect(it), 0);
        // Compute natural row height (~290px target width / sum of aspect ratios), clamped cleanly
        const rowHeight =
          row.length === 1
            ? Math.round(Math.max(150, Math.min(240, 290 / totalAspect)))
            : row.length === 2
            ? Math.round(Math.max(110, Math.min(180, 290 / totalAspect)))
            : Math.round(Math.max(92, Math.min(140, 290 / totalAspect)));

        return (
          <div
            key={rIdx}
            className="flex gap-[2px] w-full"
            style={{ height: `${rowHeight}px` }}
          >
            {row.map((item) => {
              const aspect = getAspect(item);
              return (
                <div
                  key={item.id}
                  style={{ flexGrow: aspect, flexBasis: 0 }}
                  className="h-full min-w-0"
                >
                  <AlbumTile
                    media={item.media}
                    onOpenMedia={onOpenMedia}
                    onDimensions={(w, h) => {
                      setDimsMap((prev) =>
                        prev[item.id]?.w === w && prev[item.id]?.h === h
                          ? prev
                          : { ...prev, [item.id]: { w, h } }
                      );
                    }}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
      {!hasCaption && (
        <span
          suppressHydrationWarning
          className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white/95 text-[10px] flex items-center gap-1 shadow-sm select-none pointer-events-none"
        >
          <span>{time}</span>
          {isOut && <StatusTick status={status ?? 'sent'} />}
        </span>
      )}
    </div>
  );
}

function getMediaBoxSize(w?: number, h?: number, isFullWidth = false, maxW = 280, maxH = 340) {
  if (w && h && w > 0 && h > 0) {
    let targetW = w;
    let targetH = h;
    const aspect = w / h;

    if (aspect >= 1) {
      // Landscape: limit width first
      targetW = Math.min(w, maxW);
      targetH = Math.round(targetW / aspect);
      if (targetH > 240) {
        targetH = 240;
        targetW = Math.round(targetH * aspect);
      }
      if (targetH < 130) {
        targetH = 130;
        targetW = Math.round(targetH * aspect);
      }
    } else {
      // Portrait: limit height first
      targetH = Math.min(h, maxH);
      targetW = Math.round(targetH * aspect);
      if (targetW > maxW) {
        targetW = maxW;
        targetH = Math.round(targetW / aspect);
      }
      if (targetW < 160) {
        targetW = 160;
        targetH = Math.round(targetW / aspect);
      }
    }

    targetW = Math.min(maxW, Math.max(160, targetW));
    targetH = Math.min(maxH, Math.max(130, targetH));

    return {
      width: isFullWidth ? '100%' : `${targetW}px`,
      maxWidth: `${targetW}px`,
      height: `${targetH}px`,
      aspectRatio: `${w}/${h}`,
    };
  }

  return {
    width: isFullWidth ? '100%' : '260px',
    maxWidth: '260px',
    height: '195px',
    aspectRatio: '4/3',
  };
}

function MediaContent({
  media, time, isOut, status, hasCaption, hasHeader = false, onOpenMedia, onOpenLocation,
}: {
  media: MediaAttachment;
  time: string;
  isOut: boolean;
  status?: string;
  hasCaption?: boolean;
  hasHeader?: boolean;
  onOpenMedia?: (src: string, type: 'image' | 'video') => void;
  onOpenLocation?: (loc: { lat: number; long: number; title?: string }) => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(media.localUrl ?? null);
  const [loading, setLoading] = useState(false);
  const theme = useUIStore((s) => s.theme);
  const isDarkMap = BG_THEMES[theme]?.isDark ?? true;

  useEffect(() => {
    let active = true;
    if (media.localUrl) {
      setBlobUrl(media.localUrl);
      return;
    }
    if (
      media.kind === 'photo' ||
      (media.kind === 'sticker' &&
        (media.mimeType?.startsWith('image/') ||
          media.mimeType?.startsWith('video/') ||
          media.mimeType === 'application/x-tgsticker'))
    ) {
      setLoading(true);
      downloadMediaUrl(media)
        .then((url) => {
          if (active && url) setBlobUrl(url);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [media]);

  const handleLoadAndOpen = async (type: 'image' | 'video') => {
    if (blobUrl) { onOpenMedia?.(blobUrl, type); return; }
    setLoading(true);
    const url = await downloadMediaUrl(media);
    setLoading(false);
    if (url) { setBlobUrl(url); onOpenMedia?.(url, type); }
    else toast('Could not download media', 'error');
  };

  if (media.kind === 'photo') {
    const isFullWidth = Boolean(hasCaption);
    const radiusClass = hasHeader
      ? hasCaption
        ? 'rounded-none'
        : isOut
        ? 'rounded-b-[18px] rounded-br-[5px]'
        : 'rounded-b-[18px] rounded-bl-[5px]'
      : hasCaption
      ? 'rounded-t-[18px]'
      : isOut
      ? 'rounded-[18px] rounded-br-[5px]'
      : 'rounded-[18px] rounded-bl-[5px]';
    const box = getMediaBoxSize(media.width, media.height, isFullWidth);

    return (
      <button
        onClick={() => handleLoadAndOpen('image')}
        style={{ width: box.width, maxWidth: box.maxWidth, height: box.height, aspectRatio: box.aspectRatio }}
        className={clsx(
          'relative block overflow-hidden focus:outline-none transition-transform active:scale-[0.99] text-left shrink-0',
          radiusClass
        )}
      >
        {blobUrl ? (
          <img
            src={blobUrl}
            alt="Photo"
            className="w-full h-full object-cover block"
          />
        ) : (
          <div
            className="w-full h-full bg-tg-surface/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-tg-text-hint select-none"
          >
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/80 shadow-md">
                <ImageIcon className="w-5 h-5 opacity-80" />
              </div>
            )}
            <span className="text-[11px] font-medium opacity-75">
              {loading ? 'Loading photo…' : 'Tap to load photo'}
            </span>
          </div>
        )}
        {!hasCaption && (
          <span
            suppressHydrationWarning
            className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white/95 text-[10px] flex items-center gap-1 shadow-sm select-none"
          >
            <span>{time}</span>
            {isOut && <StatusTick status={status ?? 'sent'} />}
          </span>
        )}
      </button>
    );
  }

  if (media.kind === 'sticker') {
    const isVideoSticker = Boolean(media.mimeType?.startsWith('video/'));
    return (
      <div className="relative inline-block select-none">
        {blobUrl ? (
          isVideoSticker ? (
            <video
              src={blobUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-40 h-40 object-contain drop-shadow-md"
            />
          ) : (
            <img
              src={blobUrl}
              alt={media.fileName || 'Sticker'}
              className="w-40 h-40 object-contain drop-shadow-md"
            />
          )
        ) : loading ? (
          <div className="w-40 h-40 rounded-2xl bg-tg-surface/50 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-tg-border/50" />
          </div>
        ) : (
          <div className="w-40 h-40 rounded-2xl bg-tg-surface/30 border border-tg-border/40 flex flex-col items-center justify-center gap-1.5 text-tg-text-hint">
            <svg className="w-8 h-8 text-tg-text-hint/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm6 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" />
            </svg>
            <span className="text-[11px] font-medium text-tg-text-hint/60">Sticker</span>
          </div>
        )}
        <span
          suppressHydrationWarning
          className="mt-1 ml-auto w-fit px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-sm text-white text-[10px] flex items-center gap-1"
        >
          <span>{time}</span>
          {isOut && <StatusTick status={status ?? 'sent'} />}
        </span>
      </div>
    );
  }

  if (media.kind === 'voice') {
    return (
      <VoicePlayer
        media={media}
        time={time}
        isOut={isOut}
        status={status}
      />
    );
  }

  if (media.kind === 'video') {
    const isFullWidth = Boolean(hasCaption);
    const radiusClass = hasHeader
      ? hasCaption
        ? 'rounded-none'
        : isOut
        ? 'rounded-b-[18px] rounded-br-[5px]'
        : 'rounded-b-[18px] rounded-bl-[5px]'
      : hasCaption
      ? 'rounded-t-[18px]'
      : isOut
      ? 'rounded-[18px] rounded-br-[5px]'
      : 'rounded-[18px] rounded-bl-[5px]';
    const box = getMediaBoxSize(media.width, media.height, isFullWidth);
    return (
      <button
        onClick={() => handleLoadAndOpen('video')}
        style={{ width: box.width, maxWidth: box.maxWidth, height: box.height, aspectRatio: box.aspectRatio }}
        className={clsx(
          'relative block overflow-hidden bg-black/40 text-left focus:outline-none transition-transform active:scale-[0.99] shrink-0',
          radiusClass
        )}
      >
        {blobUrl ? (
          <video src={blobUrl} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full min-h-[160px] flex items-center justify-center bg-black/50">
            <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white text-sm pl-0.5 shadow-lg">
              {loading ? '…' : '▶'}
            </div>
          </div>
        )}
        {media.duration && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium">
            {Math.floor(media.duration / 60)}:{String(Math.floor(media.duration % 60)).padStart(2, '0')}
          </span>
        )}
        {!hasCaption && (
          <span
            suppressHydrationWarning
            className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white/95 text-[10px] flex items-center gap-1 shadow-sm select-none"
          >
            <span>{time}</span>
            {isOut && <StatusTick status={status ?? 'sent'} />}
          </span>
        )}
      </button>
    );
  }

  if (media.kind === 'poll') {
    return (
      <div className="py-1 space-y-1.5 min-w-[180px]">
        <p className="text-xs font-bold">{media.pollQuestion}</p>
        {(media.pollOptions ?? []).map((opt, idx) => (
          <div key={idx} className="px-2.5 py-1.5 rounded-lg bg-black/20 text-xs">{opt}</div>
        ))}
      </div>
    );
  }

  if (media.kind === 'webpage' && media.webPage) {
    return (
      <a
        href={media.webPage.url}
        target="_blank"
        rel="noreferrer"
        className={clsx(
          'block pl-2.5 my-1.5 text-left transition-opacity hover:opacity-90',
          isOut ? 'border-l-[3px] border-white/80' : 'border-l-[3px] border-tg-blue'
        )}
      >
        {media.webPage.siteName && (
          <p className={clsx('text-[11.5px] font-semibold tracking-tight', isOut ? 'text-white/90' : 'text-tg-blue')}>
            {media.webPage.siteName}
          </p>
        )}
        {media.webPage.title && (
          <p className={clsx('text-[13px] font-semibold line-clamp-2 mt-0.5', isOut ? 'text-white' : 'text-tg-text')}>
            {media.webPage.title}
          </p>
        )}
        {media.webPage.description && (
          <p className={clsx('text-[11.5px] line-clamp-2 mt-0.5 leading-snug', isOut ? 'text-white/80' : 'text-tg-text-secondary')}>
            {media.webPage.description}
          </p>
        )}
      </a>
    );
  }

  if (media.kind === 'geo') {
    const lat = media.lat ?? 11.5564;
    const long = media.long ?? 104.9282;
    const locationLabel = (media as { title?: string }).title || `${lat.toFixed(4)}, ${long.toFixed(4)}`;
    const zoom = 15;
    const centerTile = latLngToTile(lat, long, zoom);
    return (
      <button
        type="button"
        onClick={() => onOpenLocation?.({ lat, long, title: (media as { title?: string }).title })}
        className={clsx(
          'block relative w-[260px] h-[155px] overflow-hidden shadow-sm text-left focus:outline-none active:scale-[0.99] transition-transform',
          isDarkMap ? 'bg-[#0f2936]' : 'bg-[#e8eef2]',
          hasCaption
            ? 'w-full rounded-t-[18px]'
            : isOut
            ? 'rounded-[18px] rounded-br-[5px]'
            : 'rounded-[18px] rounded-bl-[5px]'
        )}
      >
        <div
          className="absolute left-1/2 top-1/2 w-[768px] h-[768px] grid grid-cols-3 grid-rows-3 pointer-events-none select-none"
          style={{
            transform: `translate(${-256 - centerTile.fracX * 256}px, ${-256 - centerTile.fracY * 256}px)`,
          }}
        >
          {[-1, 0, 1].map((dy) =>
            [-1, 0, 1].map((dx) => (
              <img
                key={`${dx}_${dy}`}
                src={getCartoTileUrl(centerTile.x + dx, centerTile.y + dy, zoom, isDarkMap ? 'dark_all' : 'voyager')}
                alt=""
                referrerPolicy="no-referrer"
                className="w-[256px] h-[256px] block"
              />
            ))
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-tg-blue border-2 border-white shadow-lg flex items-center justify-center text-white">
            <MapPin className="w-5 h-5" />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[10px] font-medium flex items-center gap-1 justify-between">
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 text-sky-300 shrink-0" />
            <span className="truncate">{locationLabel}</span>
          </div>
          {!hasCaption && (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <span>{time}</span>
              {isOut && <StatusTick status={status ?? 'sent'} />}
            </div>
          )}
        </div>
      </button>
    );
  }

  if (media.kind === 'contact') {
    return (
      <div className="py-1">
        <p className="text-xs font-semibold">{media.contactName}</p>
        <p className="text-[11px] opacity-80">{media.contactPhone}</p>
      </div>
    );
  }

  const sizeStr = formatShortSize(media.size);
  const { ext, Icon: FileExtIcon, badge } = getFileMeta(media.fileName, media.mimeType);
  const displayFileName = formatMiddleTruncate(media.fileName || 'File', 28);
  return (
    <button
      onClick={async () => {
        setLoading(true);
        const url = await downloadMediaUrl(media);
        setLoading(false);
        if (url) {
          const a = document.createElement('a');
          a.href = url;
          a.download = media.fileName || 'file';
          a.click();
        } else toast('Download failed', 'error');
      }}
      className="flex items-center gap-2.5 text-left w-full min-w-0 max-w-full"
    >
      <div
        className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
          isOut ? 'bg-white/20 text-white' : badge
        )}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileExtIcon className="w-5 h-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p
          title={media.fileName || 'File'}
          className={clsx('text-[13.5px] font-medium truncate', isOut ? 'text-white' : 'text-tg-text')}
        >
          {displayFileName}
        </p>
        <p className={clsx('text-[11px]', isOut ? 'text-white/75' : 'text-tg-text-secondary')}>
          {[sizeStr, ext].filter(Boolean).join(' · ') || 'Tap to download'}
        </p>
      </div>
    </button>
  );
}

export function MessageBubble({
  message,
  replyPreviewText,
  senderMeta,
  showAvatar = true,
  showSenderName = false,
  selectMode = false,
  selected = false,
  onToggleSelect,
  onReply,
  onEdit,
  onPin,
  onDelete,
  onForward,
  onReact,
  onEnterSelect,
  onOpenMedia,
  onOpenLocation,
  onOpenForwarded,
}: {
  message: Msg;
  replyPreviewText?: string;
  senderMeta?: {
    name?: string;
    letters: string;
    color: string;
    peerType: 'user' | 'chat' | 'channel';
    peerId: number;
    accessHash?: string;
    hasPhoto?: boolean;
    photoId?: string;
  };
  showAvatar?: boolean;
  showSenderName?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
  onReply: (id: number) => void;
  onEdit?: (id: number) => void;
  onPin: (id: number) => void;
  onDelete: (id: number) => void;
  onForward: (id: number) => void;
  onReact: (id: number, emoji: string, remove?: boolean) => void;
  onEnterSelect?: (id: number) => void;
  onOpenMedia?: (src: string, type: 'image' | 'video') => void;
  onOpenLocation?: (loc: { lat: number; long: number; title?: string }) => void;
  onOpenForwarded?: (chatId: string) => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [localReactions, setLocalReactions] = useState<ReactionItem[]>(message.reactions ?? []);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalReactions(message.reactions ?? []);
  }, [message.reactions]);

  const safeDate = (typeof message.date === 'number' && !isNaN(message.date) && message.date > 0)
    ? message.date * 1000
    : Date.now();
  const time = new Date(safeDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const statusText = `${message.status === 'read' ? 'read' : 'sent'} today at ${time}`;

  const openMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (selectMode) return;
    e.preventDefault();
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const y = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setMenu({ x, y });
  }, [selectMode]);

  useEffect(() => {
    setLocalReactions(message.reactions ?? []);
  }, [message.reactions]);

  const handleReact = (emoji: string) => {
    const normalized = emoji.replace(/\uFE0F/g, '');
    const existing = localReactions.find((r) => r.emoji.replace(/\uFE0F/g, '') === normalized);
    const removing = Boolean(existing?.chosen);
    setLocalReactions((prev) => {
      if (removing) {
        return prev
          .map((r) => (r.emoji.replace(/\uFE0F/g, '') === normalized ? { ...r, count: r.count - 1, chosen: false } : r))
          .filter((r) => r.count > 0);
      }
      if (existing) {
        return prev.map((r) => (r.emoji.replace(/\uFE0F/g, '') === normalized ? { ...r, count: r.count + 1, chosen: true } : r));
      }
      return [...prev, { emoji: normalized, count: 1, chosen: true }];
    });
    onReact(message.id, normalized, removing);
  };

  const hasFwd = Boolean(message.forwardedFrom);
  const hasSenderName = Boolean(showSenderName && !message.out && senderMeta?.name);
  const isAlbum = Boolean(message.albumMedia && message.albumMedia.length > 1);
  const isEdgeMedia = Boolean(
    !message.text &&
    !hasFwd &&
    !hasSenderName &&
    (isAlbum || (message.media && ['photo', 'video', 'geo', 'sticker'].includes(message.media.kind)))
  );
  const isVoice = message.media?.kind === 'voice';
  const hasEdgeCaption = Boolean(
    (message.text || hasFwd || hasSenderName) &&
    (isAlbum || (message.media && ['photo', 'video', 'geo'].includes(message.media.kind)))
  );
  const hasCaption = Boolean((message.media || isAlbum) && message.text);

  return (
    <div
      id={`msg-${message.id}`}
      onClick={() => { if (selectMode) onToggleSelect?.(message.id); }}
      className={clsx('flex items-center gap-2.5 w-full', selectMode && 'cursor-pointer')}
    >
      {selectMode && (
        <div
          className={clsx(
            'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors',
            selected ? 'bg-tg-blue border-tg-blue text-white' : 'border-tg-text-hint'
          )}
        >
          {selected && <Check className="w-3 h-3" />}
        </div>
      )}

      <div className={clsx('flex flex-1 min-w-0 items-end gap-2', message.out ? 'justify-end' : 'justify-start')}>
        {!message.out && senderMeta && (
          showAvatar ? (
            <Avatar
              letters={senderMeta.letters}
              color={senderMeta.color}
              size="xs"
              peerType={senderMeta.peerType}
              peerId={senderMeta.peerId}
              accessHash={senderMeta.accessHash}
              hasPhoto={senderMeta.hasPhoto}
              photoId={senderMeta.photoId}
            />
          ) : (
            <div className="w-7 shrink-0" />
          )
        )}

        <div className="flex flex-col gap-0.5 max-w-[84%] sm:max-w-[75%] min-w-0">
          <Bubble
            align={message.out ? 'end' : 'start'}
            variant={isEdgeMedia ? 'ghost' : message.out ? 'default' : 'secondary'}
            className={clsx(isEdgeMedia && 'shadow-none', 'w-fit max-w-full')}
            onContextMenu={openMenu}
            onTouchStart={e => { longPressTimer.current = setTimeout(() => openMenu(e), 450); }}
            onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
            onTouchMove={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
          >
            <BubbleContent className={clsx(
              (isEdgeMedia || hasEdgeCaption) && '!p-0 overflow-hidden'
            )}>
              {hasSenderName && senderMeta?.name && (
                <p
                  className={clsx(
                    'text-xs font-semibold truncate mb-0.5',
                    hasEdgeCaption && 'px-3 pt-2',
                    'text-tg-blue'
                  )}
                >
                  {senderMeta.name}
                </p>
              )}

              {message.forwardedFrom && (
                <button
                  type="button"
                  disabled={!message.forwardedFrom.chatId}
                  onClick={(e) => {
                    if (message.forwardedFrom?.chatId) {
                      e.stopPropagation();
                      onOpenForwarded?.(message.forwardedFrom.chatId);
                    }
                  }}
                  className={clsx(
                    'flex items-center gap-1 text-[11.5px] leading-tight text-left mb-1 max-w-full',
                    hasEdgeCaption && (hasSenderName ? 'px-3 pb-0.5' : 'px-3 pt-2 pb-0.5'),
                    message.out ? 'text-white/90' : 'text-tg-blue',
                    message.forwardedFrom.chatId ? 'hover:underline cursor-pointer' : 'cursor-default'
                  )}
                >
                  <Forward className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    Forwarded from <span className="font-semibold">{message.forwardedFrom.name}</span>
                  </span>
                </button>
              )}

              {message.replyTo && (
                <div className={clsx('border-l-2 pl-2 mb-1 opacity-85', hasEdgeCaption && 'mx-3 mt-2', message.out ? 'border-white/70' : 'border-tg-blue')}>
                  <p className={clsx('text-xs font-medium', message.out ? 'text-white/90' : 'text-tg-blue')}>Reply</p>
                  <p className={clsx('text-xs truncate max-w-[200px]', message.out ? 'text-white/75' : 'text-tg-text-secondary')}>
                    {replyPreviewText || `Message #${message.replyTo}`}
                  </p>
                </div>
              )}

              {isAlbum && message.albumMedia ? (
                <AlbumGrid
                  items={message.albumMedia}
                  time={time}
                  isOut={message.out}
                  status={message.status}
                  hasCaption={Boolean(message.text)}
                  hasHeader={hasFwd || hasSenderName}
                  onOpenMedia={onOpenMedia}
                />
              ) : message.media ? (
                <MediaContent
                  media={message.media}
                  time={time}
                  isOut={message.out}
                  status={message.status}
                  hasCaption={Boolean(message.text)}
                  hasHeader={hasFwd || hasSenderName}
                  onOpenMedia={onOpenMedia}
                  onOpenLocation={onOpenLocation}
                />
              ) : null}

              {message.text && (
                <div className={clsx(
                  hasEdgeCaption
                    ? 'px-3 pt-2 pb-1.5 flex flex-wrap items-end gap-x-2 gap-y-0.5'
                    : hasCaption
                    ? 'pt-2 flex flex-wrap items-end gap-x-2 gap-y-0.5'
                    : 'flex flex-wrap items-end gap-x-2 gap-y-0.5'
                )}>
                  <div className="min-w-0 flex-1">
                    <RichText text={message.text} entities={message.entities} isOut={message.out} />
                  </div>
                  <div className="flex items-center gap-1 ml-auto shrink-0 pb-[1px]">
                    {message.edited && (
                      <span className={clsx('text-[10px]', message.out ? 'text-white/70' : 'text-tg-text-hint')}>edited</span>
                    )}
                    <span suppressHydrationWarning className={clsx('text-[10px]', message.out ? 'text-white/75' : 'text-tg-text-hint')}>{time}</span>
                    {message.out && <StatusTick status={message.status ?? 'sent'} />}
                  </div>
                </div>
              )}

              {!message.text && !isEdgeMedia && !isVoice && !(isAlbum || (message.media && ['photo', 'video', 'geo', 'sticker'].includes(message.media.kind))) && (
                <div className="flex items-center gap-1 mt-0.5 justify-end">
                  <span suppressHydrationWarning className={clsx('text-[10px]', message.out ? 'text-white/75' : 'text-tg-text-hint')}>{time}</span>
                  {message.out && <StatusTick status={message.status ?? 'sent'} />}
                </div>
              )}
            </BubbleContent>
          </Bubble>

          {localReactions.length > 0 && (
            <div
              className={clsx(
                'flex flex-wrap items-center gap-1 -mt-2 z-10',
                message.out ? 'justify-end pr-1.5' : 'justify-start pl-1.5'
              )}
            >
              {localReactions.map((r) => {
                const displayEmoji = r.emoji === '❤' ? '❤️' : r.emoji;
                return (
                  <button
                    key={r.emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReact(r.emoji);
                    }}
                    className={clsx(
                      'h-6 px-2.5 rounded-full text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm backdrop-blur-md',
                      r.chosen
                        ? 'bg-tg-blue text-white ring-1 ring-white/20'
                        : 'bg-tg-surface/90 border border-tg-border/30 text-tg-text hover:bg-tg-surface'
                    )}
                  >
                    <span
                      className="text-[13px] leading-none"
                      style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}
                    >
                      {displayEmoji}
                    </span>
                    <span className="text-[11px] font-semibold leading-none tabular-nums">
                      {r.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {menu && (
        <ContextMenu
          isOut={message.out}
          time={time}
          status={message.status}
          previewText={
            message.text ||
            (message.media?.kind === 'voice'
              ? '🎤 Voice message'
              : message.media?.kind === 'photo'
              ? '📷 Photo'
              : message.media?.kind === 'video'
              ? '🎬 Video'
              : message.media?.fileName || (message.media ? `[${message.media.kind}]` : ''))
          }
          statusText={statusText}
          onReact={handleReact}
          onReply={() => onReply(message.id)}
          onEdit={onEdit && message.text ? () => onEdit(message.id) : undefined}
          onPin={() => onPin(message.id)}
          onCopy={() => {
            navigator.clipboard.writeText(message.text || message.media?.fileName || '');
            toast('Copied to clipboard', 'success');
          }}
          onForward={() => onForward(message.id)}
          onDelete={() => onDelete(message.id)}
          onSelect={() => onEnterSelect?.(message.id)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

export function StatusTick({ status }: { status: string }) {
  if (status === 'sending')   return <Clock className="w-3 h-3 text-white/75 shrink-0" />;
  if (status === 'sent')      return <TelegramTicks variant="single" className="w-3.5 h-3 text-white/80 shrink-0" />;
  if (status === 'delivered') return <TelegramTicks variant="double" className="w-4 h-3 text-white/80 shrink-0" />;
  if (status === 'read')      return <TelegramTicks variant="double" className="w-4 h-3 text-sky-300 shrink-0" />;
  return null;
}
