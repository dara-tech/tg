import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  Search,
  ArrowLeft,
  X,
  Shuffle,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { fetchSearchSuggestions, extractYouTubeId } from '@/services/youtube.service';

interface YouTubeHeaderProps {
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  selectedChannel: { name: string; url?: string } | null;
  onBack: () => void;
  onSearchSubmit: (query: string) => void;
  onShuffle: () => void;
  onLogoClick: () => void;
  isSearchingOrResolving?: boolean;
}

export const YouTubeHeader = memo(function YouTubeHeader({
  isSearchOpen,
  setIsSearchOpen,
  selectedChannel,
  onBack,
  onSearchSubmit,
  onShuffle,
  onLogoClick,
  isSearchingOrResolving = false,
}: YouTubeHeaderProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [copiedChannel, setCopiedChannel] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 80);
    } else {
      setShowSuggestions(false);
    }
  }, [isSearchOpen]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions debounced
  useEffect(() => {
    const q = inputValue.trim();
    if (q.length < 2 || extractYouTubeId(q)) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const list = await fetchSearchSuggestions(q);
      setSuggestions(list);
      if (list.length > 0) {
        setShowSuggestions(true);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleSubmit = useCallback(
    (text?: string) => {
      const query = (text ?? inputValue).trim();
      if (!query) return;
      setShowSuggestions(false);
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
    } catch {
      // ignore
    }
  };

  const handleCopyChannel = () => {
    if (!selectedChannel) return;
    const url = selectedChannel.url
      ? `https://www.youtube.com${selectedChannel.url}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedChannel.name)}`;
    navigator.clipboard.writeText(url);
    setCopiedChannel(true);
    setTimeout(() => setCopiedChannel(false), 2000);
  };

  // ── Mode 1: Search Input Active ──
  if (isSearchOpen) {
    return (
      <div className="px-3.5 py-2.5 flex items-center gap-2 relative" ref={searchBoxRef}>
        <button
          onClick={() => {
            setIsSearchOpen(false);
            setShowSuggestions(false);
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
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(inputValue);
              }
            }}
            placeholder="Search YouTube or paste video link..."
            className="w-full bg-tg-surface text-tg-text placeholder-tg-text-hint text-xs rounded-full pl-4 pr-16 py-2 border border-tg-border/40 focus:outline-none focus:border-red-500 transition-colors"
            autoFocus
          />

          <div className="absolute right-2 flex items-center gap-1">
            {isSearchingOrResolving ? (
              <Loader2 className="w-4 h-4 text-red-500 animate-spin mr-1" />
            ) : inputValue ? (
              <button
                onClick={() => {
                  setInputValue('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
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

        {/* Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-[48px] left-3.5 right-3.5 z-40 bg-tg-surface border border-tg-border/40 rounded-2xl shadow-2xl overflow-hidden py-1">
            {suggestions.map((s, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setInputValue(s);
                  handleSubmit(s);
                }}
                className="px-3.5 py-2 hover:bg-tg-bg-secondary flex items-center gap-2.5 cursor-pointer text-xs text-tg-text transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-tg-text-hint shrink-0" />
                <span className="truncate flex-1 font-medium">{s}</span>
                <span className="text-[10px] text-tg-text-hint">↵</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Mode 2: Channel View (Shows Back Button) ──
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
            aria-label="Search channel"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopyChannel}
            className="h-9 px-3 rounded-full bg-tg-surface border border-tg-border/30 text-tg-text text-xs font-medium flex items-center gap-1.5 hover:bg-tg-surface/80 active:scale-95 transition-transform shrink-0"
          >
            {copiedChannel ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-tg-text-hint" />
            )}
            <span>{copiedChannel ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Mode 3: Official YouTube Home Feed Navbar (Clean, authentic brand, no redundant back button) ──
  return (
    <div className="px-3.5 pt-2 pb-2 flex items-center justify-between gap-3">
      {/* Official YouTube Logo & Typography */}
      <div
        onClick={onLogoClick}
        className="flex items-center gap-1.5 cursor-pointer select-none active:opacity-85 transition-opacity"
      >
        <div className="w-[30px] h-[21px] rounded-[6px] bg-[#FF0000] flex items-center justify-center shadow-xs shrink-0">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-current translate-x-0.2">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <span className="text-[19px] font-black tracking-[-0.04em] text-tg-text leading-none font-sans">
          YouTube
        </span>
      </div>

      {/* Right Action Icons (Search & Shuffle) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/30 flex items-center justify-center text-tg-text-secondary hover:text-tg-text active:scale-95 transition-transform"
          title="Search YouTube"
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
