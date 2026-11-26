'use client';
import { useState, useRef } from 'react';
import { MapPin, Minus, Plus, X } from 'lucide-react';
import { Avatar } from './Avatar';
import { getCartoTileUrl, latLngToTile } from '@/lib/mapTiles';
import { BG_THEMES, useUIStore } from '@/store/ui.store';

export interface LocationPreviewData {
  lat: number;
  long: number;
  title?: string;
  sender?: {
    letters: string;
    color: string;
    peerType: 'user' | 'chat' | 'channel';
    peerId: number;
    accessHash?: string;
    hasPhoto?: boolean;
    photoId?: string;
  };
}

export function LocationPreviewModal({
  location,
  onClose,
}: {
  location: LocationPreviewData;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(15);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const theme = useUIStore((s) => s.theme);
  const isDarkMap = BG_THEMES[theme]?.isDark ?? true;

  const centerTile = latLngToTile(location.lat, location.long, zoom);
  const googleMapsUrl = `https://maps.google.com/?q=${location.lat},${location.long}`;
  const appleMapsUrl = `https://maps.apple.com/?ll=${location.lat},${location.long}&q=${encodeURIComponent(location.title || 'Location')}`;

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = Math.max(-180, Math.min(180, dragRef.current.origX + (e.clientX - dragRef.current.startX)));
    const dy = Math.max(-180, Math.min(180, dragRef.current.origY + (e.clientY - dragRef.current.startY)));
    setPan({ x: dx, y: dy });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const minZoom = 12;
  const maxZoom = 18;
  const sliderPct = ((zoom - minZoom) / (maxZoom - minZoom)) * 100;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] bg-tg-bg-secondary border border-tg-border/40 rounded-[28px] shadow-2xl p-4 space-y-3.5"
      >
        {/* Top Header: X | Location Preview */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-tg-surface flex items-center justify-center text-tg-text active:scale-95 transition-transform"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-tg-text text-[15px] font-semibold">Location Preview</span>
          <div className="w-9" />
        </div>

        {/* Interactive Apple-Maps-Styled Map */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative w-full h-[330px] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none ${isDarkMap ? 'bg-[#0f2936]' : 'bg-[#e8eef2]'}`}
        >
          {/* 3x3 Seamless 256x256 Map Tiles */}
          <div
            className="absolute left-1/2 top-1/2 w-[768px] h-[768px] grid grid-cols-3 grid-rows-3 pointer-events-none select-none"
            style={{
              transform: `translate(${-256 - centerTile.fracX * 256 + pan.x}px, ${-256 - centerTile.fracY * 256 + pan.y}px)`,
            }}
          >
            {[-1, 0, 1].map((dy) =>
              [-1, 0, 1].map((dx) => (
                <img
                  key={`${dx}_${dy}`}
                  src={getCartoTileUrl(centerTile.x + dx, centerTile.y + dy, zoom, isDarkMap ? 'dark_all' : 'voyager')}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-[256px] h-[256px] block"
                />
              ))
            )}
          </div>

          {/* Pinned Sender Avatar / Marker */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
            style={{ marginLeft: `${pan.x}px`, marginTop: `${pan.y}px` }}
          >
            {location.sender ? (
              <div className="rounded-full p-0.5 bg-white shadow-xl">
                <Avatar
                  letters={location.sender.letters}
                  color={location.sender.color}
                  size="sm"
                  peerType={location.sender.peerType}
                  peerId={location.sender.peerId}
                  accessHash={location.sender.accessHash}
                  hasPhoto={location.sender.hasPhoto}
                  photoId={location.sender.photoId}
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-tg-blue border-2 border-white shadow-xl flex items-center justify-center text-white">
                <MapPin className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Bottom-left Apple Maps style badge / title */}
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md text-white/95 text-[11px] font-medium max-w-[58%] truncate pointer-events-none">
            {location.title || `${location.lat.toFixed(4)}, ${location.long.toFixed(4)}`}
          </div>

          {/* Bottom-right Zoom Controls (+ / - pill & vertical slider matching screenshot) */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute bottom-2.5 right-2.5 flex items-end gap-2 z-20"
          >
            <div className="flex flex-col bg-[#1c232d]/85 backdrop-blur-md rounded-full border border-white/10 overflow-hidden shadow-lg">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(maxZoom, z + 1))}
                className="w-9 h-9 flex items-center justify-center text-white active:bg-white/10"
                aria-label="Zoom in"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="h-[1px] bg-white/10 mx-2" />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(minZoom, z - 1))}
                className="w-9 h-9 flex items-center justify-center text-white active:bg-white/10"
                aria-label="Zoom out"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* Vertical Zoom Indicator Bar */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                setZoom(Math.round(minZoom + ratio * (maxZoom - minZoom)));
              }}
              className="w-8 h-[74px] bg-[#1c232d]/85 backdrop-blur-md rounded-full border border-white/10 flex flex-col items-center justify-center py-2.5 cursor-pointer shadow-lg"
            >
              <div className="relative w-1 h-full bg-white/25 rounded-full">
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white shadow"
                  style={{ bottom: `calc(${sliderPct}% - 5px)` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Primary & Native Apple Maps Buttons */}
        <div className="space-y-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="block w-full text-center py-3 rounded-full chat-go-gradient text-white font-semibold text-sm active:scale-[0.99] transition-all"
          >
            Open in Google Maps
          </a>
          <a
            href={appleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="block w-full text-center py-2 rounded-full bg-tg-surface text-tg-text-secondary hover:text-tg-text font-medium text-xs active:scale-[0.99] transition-all"
          >
            Open in Apple Maps
          </a>
        </div>
      </div>
    </div>
  );
}
