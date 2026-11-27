'use client';
import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { downloadPeerAvatarUrl, isMTProtoConfigured } from '@/services/telegram.real';
import clsx from 'clsx';

interface AvatarProps {
  chatId?: string;
  src?: string;
  letters?: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  isSavedMessages?: boolean;
  className?: string;
  peerType?: 'user' | 'chat' | 'channel';
  peerId?: number;
  accessHash?: string;
  hasPhoto?: boolean;
  photoId?: string;
  dcId?: number;
}

const sizes = { xs: 'w-7 h-7 text-[11px]', sm: 'w-9 h-9 text-sm', md: 'w-11 h-11 text-base', lg: 'w-14 h-14 text-xl', xl: 'w-20 h-20 text-2xl' };

const bookmarkSizes = { xs: 'w-3.5 h-3.5', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6', xl: 'w-9 h-9' };

export function Avatar({
  chatId,
  src,
  letters = '?',
  color = '#2563EB',
  size = 'md',
  online,
  isSavedMessages,
  className,
  peerType,
  peerId,
  accessHash,
  hasPhoto,
  photoId,
  dcId,
}: AvatarProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(src);

  useEffect(() => {
    if (isSavedMessages) {
      setResolvedSrc(undefined);
      return;
    }
    if (src) {
      setResolvedSrc(src);
      return;
    }
    if (!hasPhoto || !peerId || !photoId || !isMTProtoConfigured()) return;
    let active = true;
    const resolvedType =
      peerType ||
      (chatId?.startsWith('c_') ? 'channel' : chatId?.startsWith('u_') ? 'user' : 'chat');
    downloadPeerAvatarUrl(resolvedType, peerId, accessHash ?? '0', photoId, false, chatId, dcId)
      .then((url) => { if (active && url) setResolvedSrc(url); })
      .catch(() => {});
    return () => { active = false; };
  }, [src, isSavedMessages, hasPhoto, peerType, peerId, accessHash, photoId, chatId, dcId]);

  return (
    <div className={clsx('relative shrink-0', className)}>
      <div
        data-slot="avatar-inner"
        className={clsx('rounded-full flex items-center justify-center font-semibold text-white overflow-hidden', sizes[size])}
        style={{ background: isSavedMessages ? '#2AABEE' : resolvedSrc ? undefined : color }}
      >
        {isSavedMessages ? (
          <Bookmark className={clsx('text-white fill-white', bookmarkSizes[size])} />
        ) : resolvedSrc ? (
          <img src={resolvedSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          letters
        )}
      </div>
      {online && !isSavedMessages && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-tg-green border-2 border-tg-bg" />
      )}
    </div>
  );
}
