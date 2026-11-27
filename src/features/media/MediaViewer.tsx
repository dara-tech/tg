'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Forward,
  MessageSquare,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import clsx from 'clsx';

export interface MediaViewerProps {
  src: string;
  type: 'image' | 'video';
  onClose: () => void;
  senderName?: string;
  date?: number;
  caption?: string;
  onForward?: () => void;
  onReply?: () => void;
  onDelete?: () => void;
  isOut?: boolean;
}

export function MediaViewer({
  src,
  type,
  onClose,
  senderName,
  date,
  caption,
  onForward,
  onReply,
  onDelete,
  isOut,
}: MediaViewerProps) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [dismissProgress, setDismissProgress] = useState(0); // 0 to 1
  const [isDismissing, setIsDismissing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isDraggingRef = useRef(false);
  const lastTapRef = useRef<number>(0);
  const initialDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);

  // Lock background scroll when open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=') setScale((s) => Math.min(4, s + 0.5));
      else if (e.key === '-') setScale((s) => Math.max(1, s - 0.5));
      else if (e.key === '0') {
        setScale(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = type === 'video' ? 'mp4' : 'jpg';
      a.download = `tg_media_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Saved to downloads', 'success');
    } catch {
      const a = document.createElement('a');
      a.href = src;
      a.download = `media_${Date.now()}`;
      a.target = '_blank';
      a.click();
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: caption || 'Media',
          url: src,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(src);
      toast('Link copied to clipboard', 'success');
    } catch {
      toast('Could not share media', 'error');
    }
  };

  const handleCopyCaption = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!caption) return;
    navigator.clipboard.writeText(caption);
    setCopiedCaption(true);
    toast('Caption copied', 'success');
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  // Double tap to toggle zoom (images only)
  const handleContentClick = (e: React.MouseEvent) => {
    if (type === 'video') return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      e.stopPropagation();
      setScale((prev) => (prev > 1.2 ? 1 : 2.5));
      setPan({ x: 0, y: 0 });
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    // Single tap toggles controls
    setShowControls((prev) => !prev);
  };

  // Touch gestures for swipe-down to dismiss and pinch-to-zoom (images only)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (type === 'video') return;
    if (e.touches.length === 1) {
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
      isDraggingRef.current = true;
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialDistanceRef.current = dist;
      initialScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (type === 'video') return;
    if (e.touches.length === 2 && initialDistanceRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(4, Math.max(1, (dist / initialDistanceRef.current) * initialScaleRef.current));
      setScale(newScale);
      return;
    }

    if (e.touches.length === 1 && dragStartRef.current && scale === 1) {
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      if (dy > 0) {
        const progress = Math.min(1, dy / 250);
        setDismissProgress(progress);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    initialDistanceRef.current = null;
    if (dismissProgress > 0.35) {
      setIsDismissing(true);
      setTimeout(onClose, 180);
    } else {
      setDismissProgress(0);
    }
    dragStartRef.current = null;
    isDraggingRef.current = false;
  };

  const formattedDate =
    date && !isNaN(date) && date > 0
      ? new Date(date * 1000).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

  const translateY = dismissProgress * 180;
  const backdropOpacity = isDismissing ? 0 : Math.max(0.2, 1 - dismissProgress * 0.85);

  return (
    <div
      ref={containerRef}
      className={clsx(
        'fixed inset-0 z-50 flex flex-col select-none transition-colors duration-200',
        type === 'image' && 'touch-none'
      )}
      style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar Header with safe area padding */}
      <div
        className={clsx(
          'absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 transition-opacity duration-200 bg-gradient-to-b from-black/80 via-black/40 to-transparent',
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Left: Close button */}
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-sm"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Center: Sender info & timestamp */}
        <div className="flex flex-col items-center justify-center text-center px-2 min-w-0 max-w-[55%]">
          {senderName && (
            <span className="text-[14px] font-semibold text-white truncate max-w-full drop-shadow-sm">
              {senderName}
            </span>
          )}
          {formattedDate && (
            <span className="text-[11px] font-medium text-white/70 drop-shadow-sm">
              {formattedDate}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {type === 'image' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setScale((s) => (s > 1.2 ? 1 : 2.5));
                setPan({ x: 0, y: 0 });
              }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-sm"
              aria-label="Zoom"
            >
              {scale > 1.2 ? <RotateCcw className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={handleDownload}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-sm"
            aria-label="Download"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-sm"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image/Video Content */}
      <div
        onClick={handleContentClick}
        className="flex-1 flex items-center justify-center overflow-hidden cursor-zoom-in active:cursor-grabbing w-full h-full relative"
      >
        <div
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y + translateY}px, 0) scale(${scale})`,
            transition: isDraggingRef.current ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="max-w-full max-h-full flex items-center justify-center"
        >
          {type === 'image' ? (
            <img
              src={src}
              alt="media detail"
              draggable={false}
              className="max-w-full max-h-[92vh] w-auto h-auto object-contain select-none"
            />
          ) : (
            <div
              className="relative max-w-full max-h-full flex items-center justify-center p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src={src}
                controls
                playsInline
                autoPlay
                preload="auto"
                controlsList="nodownload"
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl shadow-2xl select-auto"
                onClick={(e) => e.stopPropagation()}
                onPlay={() => setShowControls(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar Footer: Caption & Actions */}
      <div
        className={clsx(
          'absolute bottom-0 inset-x-0 z-20 flex flex-col px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] transition-opacity duration-200 bg-gradient-to-t from-black/90 via-black/50 to-transparent',
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Caption (if present) */}
        {caption && (
          <div className="max-w-xl mx-auto w-full mb-3 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-start justify-between gap-2 shadow-lg">
            <p className="text-[13px] text-white/95 leading-relaxed select-text overflow-y-auto max-h-[100px] break-words">
              {caption}
            </p>
            <button
              onClick={handleCopyCaption}
              className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
              title="Copy caption"
            >
              {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Bottom Action Controls */}
        <div className="flex items-center justify-center gap-6 max-w-sm mx-auto w-full">
          {onReply && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onReply();
              }}
              className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors active:scale-95"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shadow-sm">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium">Reply</span>
            </button>
          )}

          {onForward && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onForward();
              }}
              className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors active:scale-95"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shadow-sm">
                <Forward className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium">Forward</span>
            </button>
          )}

          {onDelete && isOut && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onDelete();
              }}
              className="flex flex-col items-center gap-1 text-rose-400/90 hover:text-rose-300 transition-colors active:scale-95"
            >
              <div className="w-10 h-10 rounded-full bg-rose-500/20 backdrop-blur-md flex items-center justify-center shadow-sm">
                <Trash2 className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium">Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
