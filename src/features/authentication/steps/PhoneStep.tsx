'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input }  from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth.store';
import { sendCode } from '@/services/auth.real';
import { isMTProtoConfigured } from '@/services/telegram.real';
import { resetMTProtoSession } from '@/core/telegram/mtproto.client';
import { toast } from '@/components/ui/Toast';

export function PhoneStep({ onNext, onQr }: { onNext: () => void; onQr: () => void }) {
  const [phone, setPhone]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const { setPhone: storePhone, setPhoneCodeHash } = useAuthStore();

  const handleSend = async () => {
    if (!phone.trim()) return setError('Enter your phone number');
    if (!isMTProtoConfigured()) {
      setError('Set NEXT_PUBLIC_API_ID and NEXT_PUBLIC_API_HASH in .env.local first');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await sendCode(phone.trim());
      storePhone(phone.trim());
      setPhoneCodeHash(res.phone_code_hash);
      onNext();
    } catch (e: unknown) {
      const err = e as { error_message?: string; message?: string };
      setError(err?.error_message || err?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-6 safe-top">
      <div className="mt-12 mb-8 flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-500 to-tg-blue flex items-center justify-center shadow-lg shadow-sky-500/25">
          <svg viewBox="0 0 24 24" className="w-11 h-11 fill-white" style={{ marginRight: '2px', marginBottom: '1px' }}>
            <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
          </svg>
        </div>
        <h1 className="text-tg-text text-2xl font-bold">Telegram</h1>
        <p className="text-tg-text-secondary text-sm text-center leading-relaxed">
          Please confirm your country code and enter your phone number.
        </p>
      </div>

      <div className="w-full space-y-4">
        <Input
          type="tel"
          placeholder="+1 234 567 8900"
          value={phone}
          onChange={e => { setPhone(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          error={error}
          autoComplete="tel"
          inputMode="tel"
        />
        <Button onClick={handleSend} loading={loading}>Next</Button>
        <Button variant="ghost" onClick={onQr}>Log in by QR Code</Button>
        <button
          type="button"
          onClick={() => {
            resetMTProtoSession();
            setError('');
            toast('Session keys cleared. Ready for fresh login.', 'info');
          }}
          className="w-full text-center text-xs text-tg-text-hint hover:text-tg-blue py-1 transition-colors"
        >
          Reset connection / Clear stale keys
        </button>
      </div>

      <p className="mt-6 text-tg-text-hint text-xs text-center">
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
