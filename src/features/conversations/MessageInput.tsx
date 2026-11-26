'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { EmojiPanel }      from '@/components/ui/EmojiPanel';
import { AttachmentSheet } from '@/components/ui/AttachmentSheet';
import { toast }           from '@/components/ui/Toast';
import { Spinner }         from '@/components/ui/Spinner';
import { Check, ChevronUp, Copy, Keyboard, Mic, Paperclip, RefreshCw, Send, Smile, Sparkles, X } from 'lucide-react';
import type { RealContactItem, StickerItem, TypingActionType } from '@/services/telegram.real';
import clsx from 'clsx';

export type EnhanceTone = 'standard' | 'pro-work' | 'flirt' | 'short' | 'directly' | 'pitchy';

export interface RecentMessageItem {
  sender: 'me' | 'them';
  name?: string;
  text: string;
}

interface Props {
  initialDraft?: string;
  onDraftChange?: (text: string) => void;
  onTyping?:     (action?: TypingActionType) => void;
  onSend:        (text: string) => void;
  onSendFiles:   (files: FileList) => void;
  onSendSticker?: (s: StickerItem) => void;
  onSendLocation?: (lat: number, long: number) => void;
  onSendContact?: (c: RealContactItem) => void;
  onSendPoll?:   (question: string, options: string[]) => void;
  replyTo?:      { id: number; text: string };
  editing?:      { id: number; text: string };
  onCancelReply: () => void;
  onCancelEdit:  () => void;
  recentMessages?: RecentMessageItem[];
  canSendMedia?: boolean;
  canSendStickers?: boolean;
  canSendPolls?: boolean;
}

const TONES: Array<{ id: EnhanceTone; label: string }> = [
  { id: 'standard', label: 'Standard' },
  { id: 'pro-work', label: 'Pro-work' },
  { id: 'flirt',    label: 'Flirt' },
  { id: 'short',    label: 'Short' },
  { id: 'directly', label: 'Directly' },
  { id: 'pitchy',   label: 'Pitchy' },
];

function GeminiTwoStars({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      {/* Primary larger star */}
      <path d="M9.5 2C9.5 6.142 6.142 9.5 2 9.5C6.142 9.5 9.5 12.858 9.5 17C9.5 12.858 12.858 9.5 17 9.5C12.858 9.5 9.5 6.142 9.5 2Z" />
      {/* Secondary companion star */}
      <path d="M18.5 13C18.5 15.485 16.485 17.5 14 17.5C16.485 17.5 18.5 19.515 18.5 22C18.5 19.515 20.515 17.5 23 17.5C20.515 17.5 18.5 15.485 18.5 13Z" />
    </svg>
  );
}

export function MessageInput({
  initialDraft = '',
  onDraftChange,
  onTyping,
  onSend,
  onSendFiles,
  onSendSticker,
  onSendLocation,
  onSendContact,
  onSendPoll,
  replyTo,
  editing,
  onCancelReply,
  onCancelEdit,
  recentMessages = [],
  canSendMedia = true,
  canSendStickers = true,
  canSendPolls = true,
}: Props) {
  const [text, setText]             = useState(initialDraft);
  const [showEmoji, setShowEmoji]   = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showAi, setShowAi]         = useState(false);
  const [aiLoading, setAiLoading]   = useState(false);
  const [selectedTone, setSelectedTone] = useState<EnhanceTone>('standard');
  const [enhancedResult, setEnhancedResult] = useState<string | null>(null);

  const [recording, setRecording]   = useState(false);
  const [recSec, setRecSec]         = useState(0);
  const [inputFocused, setInputFocused] = useState(false);

  const inputRef    = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<BlobPart[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTypedRef = useRef(0);

  useEffect(() => {
    if (initialDraft && !editing) {
      setText(initialDraft);
      if (inputRef.current && inputRef.current.innerText !== initialDraft) {
        inputRef.current.innerText = initialDraft;
      }
    }
  }, [initialDraft, editing]);

  useEffect(() => {
    if (editing) {
      setText(editing.text);
      if (inputRef.current) {
        inputRef.current.innerText = editing.text;
        inputRef.current.focus();
      }
    }
  }, [editing]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    onDraftChange?.('');
    if (inputRef.current) {
      inputRef.current.innerText = '';
    }
    setShowEmoji(false);
    setShowAi(false);
    setEnhancedResult(null);
  }, [text, onSend, onDraftChange]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const raw = e.currentTarget.innerText || '';
    const val = raw === '\n' ? '' : raw;
    if (!val && e.currentTarget.innerText) {
      e.currentTarget.innerText = '';
    }
    setText(val);
    onDraftChange?.(val);

    if (Date.now() - lastTypedRef.current > 4000) {
      lastTypedRef.current = Date.now();
      onTyping?.();
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) { setText(t => t + emoji); return; }
    el.focus();
    document.execCommand('insertText', false, emoji);
    const raw = el.innerText || '';
    const val = raw === '\n' ? '' : raw;
    setText(val);
    onDraftChange?.(val);
  };

  const handleEnhance = async (tone: EnhanceTone) => {
    setSelectedTone(tone);
    setAiLoading(true);
    setEnhancedResult(null);

    try {
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          tone,
          recentMessages: recentMessages.slice(-10),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to enhance message');
      }

      setEnhancedResult(data.enhanced);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to Gemini';
      toast(msg, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyEnhanced = () => {
    if (!enhancedResult) return;
    setText(enhancedResult);
    onDraftChange?.(enhancedResult);
    setEnhancedResult(null);
    setShowAi(false);
    toast('Enhanced text applied', 'success');
    if (inputRef.current) {
      inputRef.current.innerText = enhancedResult;
      inputRef.current.focus();
    }
  };

  const handleSendEnhanced = () => {
    if (!enhancedResult) return;
    onSend(enhancedResult);
    setText('');
    onDraftChange?.('');
    if (inputRef.current) {
      inputRef.current.innerText = '';
    }
    setEnhancedResult(null);
    setShowAi(false);
  };

  const handleCopyResult = () => {
    if (!enhancedResult) return;
    navigator.clipboard.writeText(enhancedResult);
    toast('Copied to clipboard', 'success');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setRecSec(0);
      onTyping?.('sendMessageRecordAudioAction');
      timerRef.current = setInterval(() => {
        setRecSec((s) => {
          if (s > 0 && s % 4 === 0) onTyping?.('sendMessageRecordAudioAction');
          return s + 1;
        });
      }, 1000);
    } catch {
      toast('Microphone permission denied', 'error');
    }
  };

  const stopRecording = (send: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const rec = recorderRef.current;
    if (!rec) { setRecording(false); return; }
    rec.onstop = () => {
      rec.stream.getTracks().forEach((t) => t.stop());
      if (send && chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        const dt = new DataTransfer();
        dt.items.add(file);
        onSendFiles(dt.files);
      }
      chunksRef.current = [];
    };
    rec.stop();
    setRecording(false);
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="bg-tg-bg border-t border-tg-border shrink-0">
      {(replyTo || editing) && (
        <div className="flex items-center gap-2 px-4 pt-2 pb-1">
          <div className="border-l-2 border-tg-blue pl-2 flex-1 min-w-0">
            <p className="text-tg-blue text-xs font-medium">{editing ? 'Edit Message' : 'Reply'}</p>
            <p className="text-tg-text-secondary text-xs truncate">{editing ? editing.text : replyTo?.text}</p>
          </div>
          <button
            onClick={() => {
              if (editing) { setText(''); onCancelEdit(); }
              else onCancelReply();
            }}
            className="text-tg-text-hint shrink-0 p-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      {/* Gemini AI Enhancer Toolbar */}
      {showAi && (
        <div className="border-b border-tg-border bg-tg-bg-secondary px-3 py-2 space-y-2 animate-fade-in">
          {/* Tone Selector Pills & Close */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0.5 min-w-0 flex-1">
              {TONES.map((tone) => {
                const active = selectedTone === tone.id && (aiLoading || Boolean(enhancedResult));
                return (
                  <button
                    key={tone.id}
                    disabled={aiLoading}
                    onClick={() => handleEnhance(tone.id)}
                    className={clsx(
                      'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95',
                      active
                        ? 'bg-tg-blue text-white shadow-sm'
                        : 'bg-tg-surface border border-tg-border text-tg-text-secondary hover:text-tg-text hover:border-tg-blue/40'
                    )}
                  >
                    {tone.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { setShowAi(false); setEnhancedResult(null); }}
              className="text-tg-text-hint hover:text-tg-text p-1 rounded-full shrink-0 transition-colors"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Loading Shimmer */}
          {aiLoading && (
            <div className="px-3 py-2 bg-tg-surface border border-tg-border rounded-xl flex items-center gap-2 text-xs text-tg-text-secondary">
              <Spinner className="w-3.5 h-3.5 text-tg-blue shrink-0" />
              <span>Generating short reply...</span>
            </div>
          )}

          {/* Result Card */}
          {!aiLoading && enhancedResult && (
            <div className="p-2.5 bg-tg-surface border border-tg-blue/30 rounded-xl space-y-2 shadow-sm animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-tg-text font-normal leading-relaxed break-words flex-1">
                  {enhancedResult}
                </p>
                <button
                  onClick={handleCopyResult}
                  className="text-tg-text-hint hover:text-tg-text p-1 shrink-0"
                  title="Copy"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 pt-1 border-t border-tg-border/50">
                <button
                  onClick={handleApplyEnhanced}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-tg-blue text-white text-xs font-semibold hover:bg-tg-blue-dark active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Replace</span>
                </button>
                <button
                  onClick={handleSendEnhanced}
                  className="py-1.5 px-3 rounded-lg bg-tg-surface border border-tg-border text-tg-text text-xs font-semibold hover:bg-tg-border active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  title="Send message directly"
                >
                  <Send className="w-3.5 h-3.5 text-tg-blue" />
                  <span>Send</span>
                </button>
                <button
                  onClick={() => handleEnhance(selectedTone)}
                  className="p-1.5 rounded-lg bg-tg-surface border border-tg-border text-tg-text-secondary hover:text-tg-text active:scale-95 transition-all"
                  title="Regenerate"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showEmoji && (
        <EmojiPanel
          onSelect={insertEmoji}
          onSelectSticker={canSendStickers ? onSendSticker : undefined}
          onClose={() => setShowEmoji(false)}
        />
      )}

      <div
        className={clsx(
          'px-3 pt-2 bg-tg-bg-tertiary transition-[padding] duration-150',
          inputFocused
            ? 'pb-2'
            : "pb-[max(8px,env(safe-area-inset-bottom,0px))] [[data-keyboard='open']_&]:pb-2"
        )}
      >
        {recording ? (
          <div className="h-11 rounded-full bg-tg-bg-secondary border border-tg-border px-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 pl-2">
              <span className="w-2.5 h-2.5 rounded-full bg-tg-red animate-pulse" />
              <span className="text-tg-text text-sm font-medium">{fmtTime(recSec)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => stopRecording(false)} className="text-tg-red text-xs font-semibold px-2">
                Cancel
              </button>
              <button
                onClick={() => stopRecording(true)}
                className="w-9 h-9 rounded-full chat-go-gradient flex items-center justify-center text-white"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            {/* Left Floating Attach Circle */}
            {canSendMedia ? (
              <button
                onClick={() => { setShowEmoji(false); setShowAttach(true); }}
                className="w-10 h-10 rounded-full bg-tg-bg-secondary border border-tg-border flex items-center justify-center text-tg-text hover:text-tg-blue active:scale-95 transition-all shrink-0"
                aria-label="Attach"
              >
                <Paperclip className="w-[18px] h-[18px]" />
              </button>
            ) : null}

            {/* Center Pill Input */}
            <div className="flex-1 min-w-0 min-h-[40px] rounded-[22px] bg-tg-bg-secondary border border-tg-border pl-3.5 pr-1.5 py-1 flex items-end gap-1 transition-all">
              <div
                ref={inputRef}
                contentEditable
                role="textbox"
                aria-multiline="true"
                data-placeholder={editing ? 'Edit message...' : 'Message'}
                onInput={handleInput}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 min-w-0 bg-transparent text-tg-text text-sm focus:outline-none max-h-28 leading-5 py-1.5 overflow-y-auto whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-tg-text-hint empty:before:pointer-events-none scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-text"
              />

              {/* Gemini AI Enhancer Icon Button */}
              <button
                type="button"
                onClick={() => {
                  setShowEmoji(false);
                  setShowAi((v) => !v);
                }}
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95',
                  showAi
                    ? 'bg-tg-blue text-white'
                    : 'text-tg-text-hint hover:text-tg-blue'
                )}
                title="Enhance with Gemini AI"
                aria-label="Gemini AI Enhancer"
              >
                <GeminiTwoStars className="w-4 h-4" />
              </button>

              {/* Stickers / Emoji / Keyboard Toggle */}
              <button
                onClick={() => {
                  setShowAi(false);
                  setShowEmoji(v => !v);
                }}
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors active:scale-95',
                  showEmoji ? 'text-tg-blue' : 'text-tg-text-hint hover:text-tg-text'
                )}
                aria-label={showEmoji ? 'Show keyboard' : 'Stickers & Emoji'}
              >
                {showEmoji ? <Keyboard className="w-[18px] h-[18px]" /> : <Smile className="w-[18px] h-[18px]" />}
              </button>
            </div>

            {/* Right Floating Action Circle */}
            {text.trim() ? (
              <button
                onClick={handleSend}
                className="w-10 h-10 rounded-full chat-go-gradient flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                aria-label="Send"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            ) : showEmoji ? (
              <button
                onClick={() => setShowEmoji(false)}
                className="w-10 h-10 rounded-full bg-tg-bg-secondary border border-tg-border flex items-center justify-center shrink-0 text-tg-text active:scale-95 transition-transform"
                aria-label="Collapse stickers"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="w-10 h-10 rounded-full bg-tg-bg-secondary border border-tg-border flex items-center justify-center shrink-0 text-tg-text hover:text-tg-blue active:scale-95 transition-transform"
                aria-label="Voice message"
              >
                <Mic className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        )}
      </div>

      <AttachmentSheet
        open={showAttach}
        onClose={() => setShowAttach(false)}
        onFileSelect={onSendFiles}
        onSendLocation={onSendLocation}
        onSendContact={onSendContact}
        onSendPoll={onSendPoll}
        canSendPoll={canSendPolls}
      />
    </div>
  );
}
