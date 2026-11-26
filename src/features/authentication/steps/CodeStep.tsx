'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { signIn } from '@/services/auth.real';
import { isMTProtoConfigured } from '@/services/telegram.real';

export function CodeStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [code, setCode]       = useState(['', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const { phone, phoneCodeHash, setAuthorized } = useAuthStore();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const handleChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const next = [...code];
    next[i] = v.slice(-1);
    setCode(next);
    if (v && i < 4) refs.current[i + 1]?.focus();
    if (next.every(c => c) ) handleVerify(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handleVerify = async (codeStr: string) => {
    if (!isMTProtoConfigured()) {
      setError('Set NEXT_PUBLIC_API_ID and NEXT_PUBLIC_API_HASH in .env.local first');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await signIn(phone, phoneCodeHash, codeStr);
      const user = res.user as { id?: number } | undefined;
      setAuthorized(user?.id ?? 1);
      window.location.href = '/dialogs';
    } catch (e: unknown) {
      const err = e as { error_message?: string; message?: string };
      if (err?.error_message === 'SESSION_PASSWORD_NEEDED') {
        onNext();
        return;
      }
      setError(err?.error_message || err?.message || 'Invalid code');
      setCode(['', '', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-6 safe-top">
      <div className="mt-12 mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-tg-blue/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-tg-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
          </svg>
        </div>
        <h1 className="text-tg-text text-2xl font-bold">{phone}</h1>
        <p className="text-tg-text-secondary text-sm text-center">
          We&apos;ve sent a code to your phone. Enter it below.
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        {code.map((c, i) => (
          <input
            key={i}
            ref={el => { refs.current[i] = el; }}
            value={c}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className="w-12 h-14 text-center text-2xl font-bold bg-tg-surface border border-tg-border rounded-xl text-tg-text focus:outline-none focus:border-tg-blue transition-colors"
          />
        ))}
      </div>

      {error && <p className="text-tg-red text-sm mb-4">{error}</p>}

      <Button onClick={() => handleVerify(code.join(''))} loading={loading} disabled={code.some(c => !c)}>
        Verify
      </Button>
      <button onClick={onBack} className="mt-4 text-tg-blue text-sm">Change number</button>
    </div>
  );
}
