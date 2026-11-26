'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input }  from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth.store';
import { sendCode } from '@/services/auth.real';
import { isMTProtoConfigured } from '@/services/telegram.real';

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
        <div className="w-20 h-20 rounded-full bg-tg-blue flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
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
      </div>

      <p className="mt-6 text-tg-text-hint text-xs text-center">
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
