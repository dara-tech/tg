'use client';
import { useState } from 'react';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
}

export function SearchBar({ placeholder = 'Search', onSearch }: SearchBarProps) {
  const [value, setValue] = useState('');

  const handle = (v: string) => { setValue(v); onSearch(v); };

  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-text-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        value={value}
        onChange={e => handle(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-tg-surface rounded-xl pl-9 pr-4 py-2.5 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none"
      />
      {value && (
        <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => handle('')}>
          <svg className="w-4 h-4 text-tg-text-hint" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      )}
    </div>
  );
}
