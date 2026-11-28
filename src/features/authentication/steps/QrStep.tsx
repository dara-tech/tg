'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth.store';
import { exportLoginToken, importLoginToken, toBase64Url } from '@/services/auth.real';
import { getMTProto } from '@/core/telegram/mtproto.client';

interface QrStepProps {
  onBack: () => void;
  onNeedsPassword: () => void;
}

export function QrStep({ onBack, onNeedsPassword }: QrStepProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState('');
  const { setAuthorized } = useAuthStore();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const renderQr = useCallback(async (loginUrl: string) => {
    const dataUrl = await QRCode.toDataURL(loginUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });
    setQrUrl(dataUrl);
  }, []);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const apiId = parseInt(process.env.NEXT_PUBLIC_API_ID ?? '0', 10);
      const apiHash = process.env.NEXT_PUBLIC_API_HASH ?? '';

      if (!apiId || !apiHash || apiHash === 'placeholder') {
        setDemoMode(false);
        setError('Set NEXT_PUBLIC_API_ID and NEXT_PUBLIC_API_HASH in .env.local to generate a live Telegram QR code.');
        return;
      }

      setDemoMode(false);
      let res = await exportLoginToken();

      if (res._ === 'auth.loginTokenMigrateTo') {
        await getMTProto().setDefaultDc(res.dc_id);
        res = await importLoginToken(res.token);
      }

      if (res._ === 'auth.loginTokenSuccess') {
        const user = (res.authorization?.user as { id?: number } | undefined);
        setAuthorized(user?.id ?? 1);
        window.location.href = '/dialogs';
        return;
      }

      if (res._ === 'auth.loginToken') {
        const encoded = toBase64Url(new Uint8Array(res.token));
        await renderQr(`tg://login?token=${encoded}`);
        const ttl = Math.max(10, Math.round(res.expires - Date.now() / 1000));
        setSecondsLeft(ttl);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(fetchToken, ttl * 1000);
      }
    } catch (e: unknown) {
      const err = e as { error_message?: string; message?: string };
      if (err?.error_message === 'SESSION_PASSWORD_NEEDED') {
        onNeedsPassword();
        return;
      }
      setError(err?.error_message || err?.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  }, [onNeedsPassword, renderQr, setAuthorized]);

  useEffect(() => {
    fetchToken();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [fetchToken]);

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    try {
      const mt = getMTProto();
      const handler = (updateInfo: { updates?: Array<{ _: string }>; update?: { _: string } }) => {
        if (!active) return;
        const hasLoginToken =
          updateInfo?.update?._ === 'updateLoginToken' ||
          updateInfo?.updates?.some((u) => u._ === 'updateLoginToken');
        if (hasLoginToken) {
          fetchToken();
        }
      };
      mt.updates.on('updates', handler);
      mt.updates.on('updateShort', handler);
    } catch {
      // MTProto not configured
    }
    const poll = setInterval(() => {
      if (active) fetchToken();
    }, 3000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [demoMode, fetchToken]);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center px-6 safe-top pb-8">
      <div className="mt-10 mb-6 flex flex-col items-center gap-3">
        <h1 className="text-tg-text text-xl font-bold">Log in by QR Code</h1>
        {demoMode && (
          <span className="px-3 py-1 rounded-full bg-tg-surface text-tg-blue text-xs font-medium border border-tg-border">
            Demo QR · Add API keys in .env.local for live login
          </span>
        )}
      </div>

      {/* QR Container */}
      <div className="relative w-60 h-60 rounded-2xl bg-white p-3 flex items-center justify-center shadow-lg">
        {loading && !qrUrl ? (
          <Spinner className="w-8 h-8" />
        ) : qrUrl ? (
          <>
            <img src={qrUrl} alt="Telegram Login QR Code" className="w-full h-full object-contain rounded-lg" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-xl bg-tg-blue flex items-center justify-center shadow-md border-2 border-white">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" style={{ marginRight: '1px', marginBottom: '1px' }}>
                  <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                </svg>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <p className="mt-3 text-tg-text-hint text-xs">
        Refreshes in {secondsLeft}s ·{' '}
        <button onClick={fetchToken} className="text-tg-blue font-medium">
          Refresh now
        </button>
      </p>

      {error && <p className="mt-3 text-tg-red text-xs text-center">{error}</p>}

      {/* Instructions */}
      <ol className="w-full mt-6 space-y-2.5 text-sm text-tg-text-secondary bg-tg-surface rounded-2xl p-4 border border-tg-border">
        <li className="flex gap-2.5">
          <span className="w-5 h-5 rounded-full bg-tg-blue text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
          <span>Open Telegram on your phone</span>
        </li>
        <li className="flex gap-2.5">
          <span className="w-5 h-5 rounded-full bg-tg-blue text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
          <span>Go to <strong className="text-tg-text">Settings &gt; Devices &gt; Link Desktop Device</strong></span>
        </li>
        <li className="flex gap-2.5">
          <span className="w-5 h-5 rounded-full bg-tg-blue text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
          <span>Point your phone at this screen to confirm login</span>
        </li>
      </ol>

      <div className="w-full mt-6">
        <Button variant="ghost" onClick={onBack}>
          Log in by Phone Number
        </Button>
      </div>
    </div>
  );
}
