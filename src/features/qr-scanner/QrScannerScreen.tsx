'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { acceptLoginToken, fromBase64Url } from '@/services/auth.real';

export default function QrScannerScreen() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [cameraError, setCameraError] = useState<string>('');
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleDecoded = useCallback(async (data: string) => {
    stopCamera();
    setScannedValue(data);

    if (data.startsWith('tg://login?token=')) {
      const tokenStr = data.replace('tg://login?token=', '').split('&')[0];
      setProcessing(true);
      try {
        await acceptLoginToken(fromBase64Url(tokenStr));
        toast('Device linked successfully!', 'success');
        router.back();
      } catch (e: unknown) {
        const err = e as { error_message?: string; message?: string };
        toast(err?.error_message || err?.message || 'Could not link device (sign in with real API keys first)', 'error');
      } finally {
        setProcessing(false);
      }
    }
  }, [router, stopCamera]);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code?.data) {
        handleDecoded(code.data);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [handleDecoded]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setScannedValue(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera API unavailable in this browser context.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (e: unknown) {
      setCameraError(
        e instanceof Error
          ? `Camera access denied: ${e.message}`
          : 'Unable to access camera.'
      );
    }
  }, [scanFrame]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        handleDecoded(code.data);
      } else {
        toast('No QR code found in image', 'error');
      }
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-12 pb-3 safe-top bg-gradient-to-b from-black/70 to-transparent">
        <IconButton onClick={() => { stopCamera(); router.back(); }} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </IconButton>
        <h1 className="text-white font-semibold text-base">Scan QR Code</h1>
        <IconButton onClick={() => fileRef.current?.click()} className="text-white" title="Upload QR image">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </IconButton>
      </div>

      {/* Camera Feed */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder Overlay */}
        {!cameraError && !scannedValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-60 h-60 rounded-3xl border-2 border-white/30 relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              <span className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-tg-blue rounded-tl-2xl" />
              <span className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-tg-blue rounded-tr-2xl" />
              <span className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-tg-blue rounded-bl-2xl" />
              <span className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-tg-blue rounded-br-2xl" />
            </div>
            <p className="mt-6 text-white/85 text-sm text-center px-6">
              Point your camera at a Telegram QR code
            </p>
          </div>
        )}

        {/* Camera Error Fallback */}
        {cameraError && (
          <div className="absolute inset-0 bg-tg-bg flex flex-col items-center justify-center px-6 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-tg-surface flex items-center justify-center text-3xl">📷</div>
            <p className="text-tg-text font-semibold">Camera Unavailable</p>
            <p className="text-tg-text-secondary text-sm">{cameraError}</p>
            <div className="w-full space-y-2 mt-2">
              <Button onClick={() => fileRef.current?.click()}>Upload QR Image from Gallery</Button>
              <Button variant="secondary" onClick={startCamera}>Retry Camera</Button>
            </div>
          </div>
        )}

        {/* Scanned Result Sheet */}
        {scannedValue && (
          <div className="absolute inset-x-0 bottom-0 bg-tg-bg-secondary rounded-t-2xl p-6 safe-bottom border-t border-tg-border space-y-4 animate-slide-up">
            <p className="text-tg-text font-semibold text-base">QR Code Detected</p>
            <p className="text-tg-text-secondary text-xs break-all bg-tg-surface p-3 rounded-xl border border-tg-border">
              {scannedValue}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(scannedValue);
                  toast('Copied to clipboard', 'success');
                }}
                disabled={processing}
              >
                Copy
              </Button>
              <Button onClick={startCamera} loading={processing}>
                Scan Again
              </Button>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
}
