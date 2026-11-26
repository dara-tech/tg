'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar }   from '@/components/ui/Avatar';
import { useDialogsStore } from '@/store/dialogs.store';
import { isMTProtoConfigured, searchGlobal, type RealDialogItem } from '@/services/telegram.real';

export default function SearchScreen() {
  const router  = useRouter();
  const [q, setQ] = useState('');
  const { dialogs } = useDialogsStore();
  const [remoteResults, setRemoteResults] = useState<RealDialogItem[]>([]);

  useEffect(() => {
    if (!q.trim() || !isMTProtoConfigured()) {
      setRemoteResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchGlobal(q.trim()).then(setRemoteResults).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const localResults = q.length > 0
    ? dialogs.filter(d => d.title.toLowerCase().includes(q.toLowerCase()))
    : [];

  const seen = new Set(localResults.map((d) => d.id));
  const results = [...localResults, ...remoteResults.filter((r) => !seen.has(r.id))];

  return (
    <div className="flex flex-col h-full bg-tg-bg">
      <div className="flex items-center gap-2 px-3 pt-3 pb-3 safe-top bg-tg-bg border-b border-tg-border">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-text-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search"
            className="w-full bg-tg-surface rounded-xl pl-9 pr-4 py-2.5 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none"
          />
        </div>
        <button onClick={() => router.back()} className="text-tg-blue text-sm font-medium shrink-0">Cancel</button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {!q && (
          <p className="text-tg-text-hint text-sm text-center mt-16">
            Search for chats, contacts, and messages
          </p>
        )}
        {q && results.length === 0 && (
          <p className="text-tg-text-hint text-sm text-center mt-16">No results for &ldquo;{q}&rdquo;</p>
        )}
        {results.map(d => (
          <button key={d.id} onClick={() => router.push(`/chat/${d.id}`)}
            className="w-full flex items-center gap-3 px-4 py-3 active:bg-tg-surface">
            <Avatar letters={d.avatarLetters} color={d.avatarColor} />
            <div className="text-left flex-1">
              <p className="text-tg-text font-medium text-sm">{d.title}</p>
              <p className="text-tg-text-hint text-xs capitalize">{d.peerType}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
