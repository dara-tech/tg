'use client';
import { useState } from 'react';

interface MediaViewerProps { src: string; type: 'image' | 'video'; onClose: () => void; }

export function MediaViewer({ src, type, onClose }: MediaViewerProps) {
  const [scale, setScale] = useState(1);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex justify-between p-4">
        <button onClick={onClose} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <div className="flex gap-3 text-white">
          <button>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
          </button>
          <button>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {type === 'image' ? (
          <img src={src} alt="media" className="max-w-full max-h-full object-contain" style={{ transform: `scale(${scale})` }} />
        ) : (
          <video src={src} controls className="max-w-full max-h-full" />
        )}
      </div>
    </div>
  );
}
