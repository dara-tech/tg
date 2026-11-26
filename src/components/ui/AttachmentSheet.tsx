'use client';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart2,
  Coffee,
  FileText,
  Image as ImageIcon,
  Layers,
  MapPin,
  Music,
  Navigation,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  Utensils,
  X,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { toast } from './Toast';
import { fetchRealContacts, isMTProtoConfigured, type RealContactItem } from '@/services/telegram.real';
import { getCartoTileUrl, latLngToTile, type CartoBasemapStyle } from '@/lib/mapTiles';
import clsx from 'clsx';

interface AttachmentSheetProps {
  open: boolean;
  onClose: () => void;
  onFileSelect: (files: FileList) => void;
  onSendLocation?: (lat: number, long: number) => void;
  onSendContact?: (contact: RealContactItem) => void;
  onSendPoll?: (question: string, options: string[]) => void;
  canSendPoll?: boolean;
}

type AttachTab = 'gallery' | 'file' | 'location' | 'poll' | 'contact';

const NEARBY_PLACES = [
  { name: 'Doors Music & Tapas', addr: "No 18' Street 47 & 84", lat: 11.5731, long: 104.9212, color: 'bg-orange-500', icon: Music },
  { name: 'Metro Hassakan (Metro Cafe)', addr: '#271, St. 148 and Sisowath Quay', lat: 11.5698, long: 104.9308, color: 'bg-amber-500', icon: Sparkles },
  { name: 'Backyard Cafe', addr: '11B Street 246', lat: 11.5582, long: 104.9265, color: 'bg-orange-600', icon: Coffee },
  { name: 'Kravanh Restaurant', addr: '#112, Sothearos Blvd', lat: 11.5564, long: 104.9315, color: 'bg-red-500', icon: Utensils },
  { name: 'Independence Monument', addr: 'Norodom Blvd, Phnom Penh', lat: 11.5564, long: 104.9282, color: 'bg-rose-500', icon: Star },
];

export function AttachmentSheet({
  open,
  onClose,
  onFileSelect,
  onSendLocation,
  onSendContact,
  onSendPoll,
  canSendPoll = true,
}: AttachmentSheetProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<AttachTab>('location');
  const [searchOpen, setSearchOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [coords, setCoords] = useState<{ lat: number; long: number; accuracy: number }>({
    lat: 11.5564,
    long: 104.9282,
    accuracy: 5,
  });
  const [mapStyle, setMapStyle] = useState<CartoBasemapStyle>('voyager');

  const [question, setQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [contacts, setContacts] = useState<RealContactItem[]>([]);
  const [contactQuery, setContactQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            long: pos.coords.longitude,
            accuracy: Math.max(5, Math.round(pos.coords.accuracy || 5)),
          });
        },
        () => {}
      );
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (open && activeTab === 'contact' && isMTProtoConfigured() && contacts.length === 0) {
      fetchRealContacts().then(setContacts).catch(() => {});
    }
  }, [open, activeTab, contacts.length]);

  const resetAndClose = () => {
    setSearchOpen(false);
    setPlaceQuery('');
    setQuestion('');
    setPollOptions(['', '']);
    setContactQuery('');
    onClose();
  };

  const handleShareCurrentLocation = () => {
    if (!navigator.geolocation) {
      onSendLocation?.(coords.lat, coords.long);
      resetAndClose();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSendLocation?.(pos.coords.latitude, pos.coords.longitude);
        resetAndClose();
      },
      () => {
        onSendLocation?.(coords.lat, coords.long);
        resetAndClose();
      }
    );
  };

  const handleRecenter = () => {
    if (!navigator.geolocation) {
      toast('Geolocation not supported', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          long: pos.coords.longitude,
          accuracy: Math.max(5, Math.round(pos.coords.accuracy || 5)),
        });
        toast('Location updated', 'success');
      },
      () => toast('Location permission denied', 'error')
    );
  };

  const handleCreatePoll = () => {
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || opts.length < 2) {
      toast('Enter a question and at least 2 options', 'error');
      return;
    }
    onSendPoll?.(question.trim(), opts);
    resetAndClose();
  };

  if (!open) return null;

  const zoom = 15;
  const centerTile = latLngToTile(coords.lat, coords.long, zoom);
  const tileUrl = (dx: number, dy: number) =>
    getCartoTileUrl(centerTile.x + dx, centerTile.y + dy, zoom, mapStyle);

  const filteredPlaces = NEARBY_PLACES.filter(
    (p) =>
      !placeQuery.trim() ||
      p.name.toLowerCase().includes(placeQuery.toLowerCase()) ||
      p.addr.toLowerCase().includes(placeQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(
    (c) =>
      !contactQuery.trim() ||
      c.name.toLowerCase().includes(contactQuery.toLowerCase()) ||
      (c.username && c.username.toLowerCase().includes(contactQuery.toLowerCase()))
  );

  const TABS: Array<{ id: AttachTab; label: string; icon: React.ReactNode }> = [
    { id: 'gallery',  label: 'Gallery',  icon: <ImageIcon className="w-[18px] h-[18px]" /> },
    { id: 'file',     label: 'File',     icon: <FileText  className="w-[18px] h-[18px]" /> },
    { id: 'location', label: 'Location', icon: <MapPin    className="w-[18px] h-[18px]" /> },
    ...(canSendPoll ? [{ id: 'poll' as const, label: 'Poll', icon: <BarChart2 className="w-[18px] h-[18px]" /> }] : []),
    { id: 'contact',  label: 'Contact',  icon: <User      className="w-[18px] h-[18px]" /> },
  ];

  const renderHeader = (label: string) => (
    <div className="flex items-center justify-between px-4 py-3 bg-tg-bg-secondary/95 border-b border-tg-border/35 shrink-0">
      <button
        type="button"
        onClick={resetAndClose}
        className="w-9 h-9 rounded-full bg-tg-surface border border-tg-border/35 flex items-center justify-center text-tg-text active:scale-95 transition-transform"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
      <span className="text-tg-text text-[15px] font-semibold tracking-tight">{label}</span>
      <div className="w-9" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-fade-in"
        onClick={resetAndClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet matching Telegram iOS Attachment Sheet */}
      <div className="relative w-full max-w-md bg-tg-bg border-t border-tg-border/35 rounded-t-[28px] shadow-2xl z-10 overflow-hidden flex flex-col h-[84dvh] max-h-[760px] animate-slide-up">
        {/* TAB: LOCATION */}
        {activeTab === 'location' && (
          <div className="flex-1 min-h-0 flex flex-col bg-tg-bg-secondary">
            {/* Edge-to-Edge Map Header */}
            <div className="relative h-[44%] min-h-[210px] w-full overflow-hidden bg-tg-surface shrink-0">
              {/* 3x3 Seamless 256x256 Map Tiles centered on exact lat/long */}
              <div
                className={clsx(
                  'absolute left-1/2 top-1/2 w-[768px] h-[768px] grid grid-cols-3 grid-rows-3 pointer-events-none select-none transition-all',
                  mapStyle === 'dark_all' && 'invert hue-rotate-180 brightness-95 contrast-90'
                )}
                style={{
                  transform: `translate(${-256 - centerTile.fracX * 256}px, ${-256 - centerTile.fracY * 256}px)`,
                }}
              >
                {[-1, 0, 1].map((dy) =>
                  [-1, 0, 1].map((dx) => (
                    <img
                      key={`${dx}_${dy}`}
                      src={tileUrl(dx, dy)}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-[256px] h-[256px] block"
                    />
                  ))
                )}
              </div>

              {/* Floating Top Bar: X | Location pill | Search */}
              <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between z-10">
                <button
                  onClick={resetAndClose}
                  className="w-9 h-9 rounded-full bg-tg-bg-secondary/95 backdrop-blur-md shadow-md border border-tg-border/30 flex items-center justify-center text-tg-text active:scale-95 transition-transform"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="px-4 py-1.5 rounded-full bg-tg-bg-secondary/95 backdrop-blur-md shadow-md border border-tg-border/30 text-tg-text text-sm font-semibold">
                  Location
                </span>
                <button
                  onClick={() => setSearchOpen((v) => !v)}
                  className={clsx(
                    'w-9 h-9 rounded-full backdrop-blur-md shadow-md border border-tg-border/30 flex items-center justify-center active:scale-95 transition-transform',
                    searchOpen ? 'bg-tg-blue text-white' : 'bg-tg-bg-secondary/95 text-tg-text'
                  )}
                  aria-label="Search places"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Center Location Pin with cone */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full bg-tg-blue border-[3px] border-white shadow-xl flex items-center justify-center text-white z-10">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="w-3 h-3 rounded-full bg-tg-blue border-2 border-white -mt-1.5 shadow z-10" />
                  <div
                    className="w-12 h-7 -mt-2 opacity-35"
                    style={{
                      background: 'radial-gradient(ellipse at top, var(--tg-blue, #7C3AED), transparent 75%)',
                    }}
                  />
                </div>
              </div>

              {/* Bottom-right floating map controls */}
              <div className="absolute bottom-3 right-3 flex flex-col gap-2 z-10">
                <button
                  onClick={() => setMapStyle((s) => (s === 'voyager' ? 'dark_all' : 'voyager'))}
                  className="w-9 h-9 rounded-full bg-tg-bg-secondary/95 backdrop-blur-md shadow-md border border-tg-border/30 flex items-center justify-center text-tg-blue active:scale-95 transition-transform"
                  aria-label="Switch map style"
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRecenter}
                  className="w-9 h-9 rounded-full bg-tg-bg-secondary/95 backdrop-blur-md shadow-md border border-tg-border/30 flex items-center justify-center text-tg-blue active:scale-95 transition-transform"
                  aria-label="Recenter GPS"
                >
                  <Navigation className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>

            {/* Places Body */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4 pt-3 pb-3 space-y-3">
              {searchOpen && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-tg-text-hint absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    autoFocus
                    value={placeQuery}
                    onChange={(e) => setPlaceQuery(e.target.value)}
                    placeholder="Search places…"
                    className="w-full bg-tg-surface border border-tg-border/35 rounded-full pl-9 pr-3 py-2 text-xs text-tg-text placeholder:text-tg-text-hint focus:outline-none"
                  />
                </div>
              )}

              {/* Send My Current Location */}
              <button
                onClick={handleShareCurrentLocation}
                className="w-full flex items-center gap-3.5 py-1.5 active:bg-tg-surface rounded-xl text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-tg-blue flex items-center justify-center text-white shrink-0 shadow-sm">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-tg-text text-[15px] font-semibold leading-snug">
                    Send My Current Location
                  </p>
                  <p className="text-tg-text-hint text-xs">
                    Accurate to {coords.accuracy} metres
                  </p>
                </div>
              </button>

              <div className="pt-1">
                <p className="text-tg-text-hint text-[11px] font-semibold uppercase tracking-wider mb-2">
                  Or choose a place
                </p>
                <div className="space-y-2.5">
                  {filteredPlaces.map((p) => {
                    const IconComp = p.icon;
                    return (
                      <button
                        key={p.name}
                        onClick={() => {
                          onSendLocation?.(p.lat, p.long);
                          resetAndClose();
                        }}
                        className="w-full flex items-center gap-3.5 py-1 active:bg-tg-surface rounded-xl text-left transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-full ${p.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-tg-text text-[15px] font-medium truncate">{p.name}</p>
                          <p className="text-tg-text-hint text-xs truncate">{p.addr}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: GALLERY */}
        {activeTab === 'gallery' && (
          <div className="flex-1 min-h-0 flex flex-col bg-tg-bg-tertiary">
            {renderHeader('Gallery')}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-[320px] bg-tg-bg-secondary border border-tg-border/35 shadow-sm rounded-3xl p-7 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-tg-blue/15 text-tg-blue flex items-center justify-center">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-tg-text text-base font-semibold">Photos & Videos</p>
                  <p className="text-tg-text-hint text-xs mt-1 leading-relaxed">
                    Select photos or videos from your device to send in this chat
                  </p>
                </div>
                <Button
                  onClick={() => galleryRef.current?.click()}
                  className="!w-auto px-7 rounded-full whitespace-nowrap chat-go-gradient shadow-md"
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>Choose from Gallery</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: FILE */}
        {activeTab === 'file' && (
          <div className="flex-1 min-h-0 flex flex-col bg-tg-bg-tertiary">
            {renderHeader('File')}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-[320px] bg-tg-bg-secondary border border-tg-border/35 shadow-sm rounded-3xl p-7 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-tg-blue/15 text-tg-blue flex items-center justify-center">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-tg-text text-base font-semibold">Send a Document</p>
                  <p className="text-tg-text-hint text-xs mt-1 leading-relaxed">
                    Share PDFs, audio files, archives, or any document
                  </p>
                </div>
                <Button
                  onClick={() => fileRef.current?.click()}
                  className="!w-auto px-7 rounded-full whitespace-nowrap chat-go-gradient shadow-md"
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>Browse Files</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: POLL */}
        {activeTab === 'poll' && (
          <div className="flex-1 min-h-0 flex flex-col bg-tg-bg-tertiary">
            {renderHeader('Create Poll')}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
              <div>
                <p className="text-tg-text-hint text-[11px] font-semibold uppercase tracking-wider px-1 mb-1.5">
                  Question
                </p>
                <div className="bg-tg-bg-secondary border border-tg-border/35 shadow-sm rounded-2xl overflow-hidden">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    className="w-full bg-transparent px-4 py-3 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <p className="text-tg-text-hint text-[11px] font-semibold uppercase tracking-wider px-1 mb-1.5">
                  Answer Options
                </p>
                <div className="bg-tg-bg-secondary border border-tg-border/35 shadow-sm rounded-2xl divide-y divide-tg-border/35 overflow-hidden">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center pr-2">
                      <input
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollOptions];
                          next[idx] = e.target.value;
                          setPollOptions(next);
                        }}
                        placeholder={idx === 0 ? 'Option 1 (e.g. Yes)' : idx === 1 ? 'Option 2 (e.g. No)' : `Option ${idx + 1}`}
                        className="flex-1 bg-transparent px-4 py-3 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-tg-text-hint hover:text-rose-500 transition-colors"
                          aria-label="Remove option"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions((prev) => [...prev, ''])}
                      className="w-full px-4 py-2.5 flex items-center gap-2 text-tg-blue text-sm font-medium active:bg-tg-surface text-left"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add an Option</span>
                    </button>
                  )}
                </div>
              </div>

              <Button
                onClick={handleCreatePoll}
                className="rounded-full chat-go-gradient shadow-md"
              >
                Send Poll
              </Button>
            </div>
          </div>
        )}

        {/* TAB: CONTACT */}
        {activeTab === 'contact' && (
          <div className="flex-1 min-h-0 flex flex-col bg-tg-bg-tertiary">
            {renderHeader('Share Contact')}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-tg-text-hint absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                  placeholder="Search contacts…"
                  className="w-full bg-tg-bg-secondary border border-tg-border/35 rounded-full pl-10 pr-4 py-2 text-sm text-tg-text placeholder:text-tg-text-hint focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
              {filteredContacts.length === 0 ? (
                <p className="text-tg-text-hint text-sm text-center py-10">No contacts available</p>
              ) : (
                <div className="bg-tg-bg-secondary border border-tg-border/35 shadow-sm rounded-2xl divide-y divide-tg-border/35 overflow-hidden">
                  {filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSendContact?.(c);
                        resetAndClose();
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 active:bg-tg-surface text-left transition-colors"
                    >
                      <Avatar
                        letters={c.letters}
                        color={c.color}
                        size="sm"
                        online={c.online}
                        peerType="user"
                        peerId={c.id}
                        accessHash={c.accessHash}
                        hasPhoto={c.hasPhoto}
                        photoId={c.photoId}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-tg-text text-sm font-medium truncate">{c.name}</p>
                        <p className="text-tg-text-hint text-xs truncate">{c.phone || c.username || 'Telegram user'}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-tg-blue/12 text-tg-blue text-xs font-semibold shrink-0">
                        Send
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Persistent Bottom Tab Strip (no clipping, safe-bottom inside bar) */}
        <div className="shrink-0 bg-tg-bg-secondary/95 backdrop-blur-md border-t border-tg-border/35 px-2 pt-2 pb-3 safe-bottom flex items-center justify-around">
          {TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="flex flex-col items-center gap-1 min-w-[56px] active:scale-95 transition-transform"
              >
                <div
                  className={clsx(
                    'px-3.5 py-1 rounded-full transition-colors flex items-center justify-center',
                    isActive ? 'bg-tg-blue/15 text-tg-blue' : 'text-tg-text-hint'
                  )}
                >
                  {t.icon}
                </div>
                <span
                  className={clsx(
                    'text-[10.5px] font-medium leading-tight',
                    isActive ? 'text-tg-blue font-semibold' : 'text-tg-text-hint'
                  )}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        <input
          ref={galleryRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              onFileSelect(e.target.files);
              resetAndClose();
            }
          }}
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              onFileSelect(e.target.files);
              resetAndClose();
            }
          }}
        />
      </div>
    </div>
  );
}
