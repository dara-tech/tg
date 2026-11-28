import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Search, ArrowLeft, X, Shuffle, Loader2 } from 'lucide-react';

interface DailymotionHeaderProps {
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  selectedChannel: { name: string } | null;
  onBack: () => void;
  onSearchSubmit: (query: string) => void;
  onShuffle: () => void;
  onLogoClick: () => void;
  isSearching?: boolean;
}

export const DailymotionHeader = memo(function DailymotionHeader({
  isSearchOpen,
  setIsSearchOpen,
  selectedChannel,
  onBack,
  onSearchSubmit,
  onShuffle,
  onLogoClick,
  isSearching = false,
}: DailymotionHeaderProps) {
  const [inputValue, setInputValue] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 80);
    }
  }, [isSearchOpen]);

  const handleSubmit = useCallback(
    (text?: string) => {
      const query = (text ?? inputValue).trim();
      if (!query) return;
      onSearchSubmit(query);
    },
    [inputValue, onSearchSubmit]
  );

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputValue(text);
        handleSubmit(text);
      }
    } catch {}
  };

  // ── Mode 1: Search Input Active ──
  if (isSearchOpen) {
    return (
      <div className="px-3.5 py-2.5 flex items-center gap-2 relative">
        <button
          onClick={() => {
            setIsSearchOpen(false);
          }}
          className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/30 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-transform shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 relative flex items-center">
          <input
            ref={searchInputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(inputValue);
              }
            }}
            placeholder="Search Dailymotion (movies, drama, news)…"
            className="w-full bg-tg-surface text-tg-text placeholder-tg-text-hint text-xs rounded-full pl-4 pr-16 py-2 border border-tg-border/40 focus:outline-none focus:border-[#0066dc] transition-colors"
            autoFocus
          />

          <div className="absolute right-2 flex items-center gap-1">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-[#0066dc] animate-spin mr-1" />
            ) : inputValue ? (
              <button
                onClick={() => setInputValue('')}
                className="p-1 text-tg-text-hint hover:text-tg-text"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handlePasteClipboard}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium text-tg-text-secondary hover:text-tg-text hover:bg-tg-bg-secondary transition-colors"
              >
                Paste
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Mode 2: Channel View ──
  if (selectedChannel) {
    return (
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/30 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-transform shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-[16px] font-bold text-tg-text truncate leading-none">
            {selectedChannel.name}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/30 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-transform"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Mode 3: Authentic Home Feed Navbar ──
  return (
    <div className="px-3.5 pt-2 pb-2 flex items-center justify-between gap-3">
      {/* Official Dailymotion Logo & Typography */}
      <div
        onClick={onLogoClick}
        className="flex items-center gap-2 cursor-pointer select-none active:opacity-85 transition-opacity"
      >
        <div className="w-[28px] h-[28px] rounded-[8px] bg-[#0066dc] flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
          <img
            src="/icons/dailymotion.svg"
            alt="Dailymotion"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-[19px] font-black tracking-[-0.04em] text-tg-text leading-none font-sans">
          dailymotion
        </span>
      </div>

      {/* Right Action Icons (Search & Refresh) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/30 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-transform"
          title="Search Dailymotion"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={onShuffle}
          className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/30 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-transform"
          title="Discover fresh videos"
          aria-label="Shuffle"
        >
          <Shuffle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
