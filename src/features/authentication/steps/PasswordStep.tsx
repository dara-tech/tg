'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input }  from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth.store';
import { getPasswordInfo, signInWithPassword } from '@/services/auth.real';
import { isMTProtoConfigured } from '@/services/telegram.real';

export function PasswordStep({ onBack }: { onBack: () => void }) {
  const [password, setPassword] = useState('');
  const [hint, setHint]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { setAuthorized } = useAuthStore();

  useEffect(() => {
    if (!isMTProtoConfigured()) return;
    getPasswordInfo()
      .then((info) => { if (info.hint) setHint(info.hint); })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!password) return setError('Enter your password');
    if (!isMTProtoConfigured()) {
      setError('Set NEXT_PUBLIC_API_ID and NEXT_PUBLIC_API_HASH in .env.local first');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await signInWithPassword(password);
      const user = res.user as { id?: number } | undefined;
      setAuthorized(user?.id ?? 1);
      window.location.href = '/dialogs';
    } catch (e: unknown) {
      const err = e as { error_message?: string; message?: string };
      setError(
        err?.error_message === 'PASSWORD_HASH_INVALID'
          ? 'Wrong password'
          : err?.error_message || err?.message || 'Wrong password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-6 safe-top">
      <div className="mt-12 mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-tg-blue/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-tg-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <h1 className="text-tg-text text-2xl font-bold">Two-Step Verification</h1>
        <p className="text-tg-text-secondary text-sm text-center">
          Your account is protected with an additional password.
          {hint ? ` (Hint: ${hint})` : ''}
        </p>
      </div>
      <div className="w-full space-y-4">
        <Input
          type="password"
          placeholder={hint ? `Password (${hint})` : 'Your password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          error={error}
        />
        <Button onClick={handleSubmit} loading={loading}>Submit</Button>
      </div>
      <button onClick={onBack} className="mt-4 text-tg-blue text-sm">Back</button>
    </div>
  );
}
