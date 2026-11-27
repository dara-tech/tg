import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AccentId = 'blue' | 'purple' | 'emerald' | 'orange' | 'rose' | 'slate';
export type BgThemeId = 'white' | 'clay' | 'cream' | 'manga' | 'bento' | 'dark' | 'black';
export type NavStyleId = 'pill' | 'classic' | 'card' | 'minimal';
export type ChatWallpaperId =
  | 'default'
  | 'telegram-doodle'
  | 'manga-screentone'
  | 'bento-mesh'
  | 'emerald-mist'
  | 'ocean-dusk'
  | 'sunset-linen'
  | 'midnight-aurora'
  | 'custom';

export const CHAT_WALLPAPERS: Record<
  Exclude<ChatWallpaperId, 'custom'>,
  { name: string; gradient?: string; pattern?: boolean }
> = {
  'default':          { name: 'Theme Default' },
  'telegram-doodle':  { name: 'Telegram Classic', gradient: 'linear-gradient(155deg, rgba(16,185,129,0.18) 0%, rgba(14,165,233,0.16) 50%, rgba(139,92,246,0.18) 100%)', pattern: true },
  'manga-screentone': { name: 'Manga Halftone',   gradient: 'radial-gradient(circle at 7px 7px, rgba(0,0,0,0.18) 1.5px, #FFFFFF 1.5px)', pattern: true },
  'bento-mesh':       { name: 'Bento Grid',       gradient: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, #09090B 1px)', pattern: true },
  'emerald-mist':     { name: 'Emerald Mist',     gradient: 'linear-gradient(160deg, #064e3b 0%, #0f766e 48%, #022c22 100%)', pattern: true },
  'ocean-dusk':       { name: 'Ocean Dusk',       gradient: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 52%, #0c4a6e 100%)', pattern: true },
  'sunset-linen':     { name: 'Warm Sunset',      gradient: 'linear-gradient(155deg, #fef3c7 0%, #fed7aa 48%, #fecdd3 100%)', pattern: true },
  'midnight-aurora':  { name: 'Midnight Aurora',  gradient: 'linear-gradient(160deg, #09090b 0%, #312e81 50%, #581c87 100%)', pattern: true },
};
export type KhmerFontId =
  | 'hanuman'
  | 'kantumruy-pro'
  | 'noto-sans-khmer'
  | 'noto-serif-khmer'
  | 'battambang'
  | 'siemreap'
  | 'nokora'
  | 'koh-santepheap'
  | 'kdam-thmor-pro'
  | 'konkhmer-sleokchher'
  | 'suwannaphum'
  | 'content'
  | 'koulen'
  | 'dangrek'
  | 'moul'
  | 'moulpali'
  | 'preahvihear'
  | 'bayon'
  | 'bokor'
  | 'chenla'
  | 'freehand'
  | 'fasthand'
  | 'taprom'
  | 'odor-mean-chey'
  | 'angkor'
  | 'metal';

export interface KhmerFontMeta {
  name: string;
  googleFamily: string;
  query: string;
  category: 'Sans' | 'Serif' | 'Display' | 'Handwriting';
}

export const KHMER_FONTS: Record<KhmerFontId, KhmerFontMeta> = {
  'hanuman':             { name: 'Hanuman',             googleFamily: 'Hanuman',             query: 'Hanuman:wght@400;700',             category: 'Serif' },
  'kantumruy-pro':       { name: 'Kantumruy Pro',       googleFamily: 'Kantumruy Pro',       query: 'Kantumruy+Pro:wght@400;700',       category: 'Sans' },
  'noto-sans-khmer':     { name: 'Noto Sans Khmer',     googleFamily: 'Noto Sans Khmer',     query: 'Noto+Sans+Khmer:wght@400;700',     category: 'Sans' },
  'noto-serif-khmer':    { name: 'Noto Serif Khmer',    googleFamily: 'Noto Serif Khmer',    query: 'Noto+Serif+Khmer:wght@400;700',    category: 'Serif' },
  'battambang':          { name: 'Battambang',          googleFamily: 'Battambang',          query: 'Battambang:wght@400;700',          category: 'Sans' },
  'siemreap':            { name: 'Siemreap',            googleFamily: 'Siemreap',            query: 'Siemreap',                         category: 'Sans' },
  'nokora':              { name: 'Nokora',              googleFamily: 'Nokora',              query: 'Nokora:wght@400;700',              category: 'Sans' },
  'koh-santepheap':      { name: 'Koh Santepheap',      googleFamily: 'Koh Santepheap',      query: 'Koh+Santepheap:wght@400;700',      category: 'Serif' },
  'kdam-thmor-pro':      { name: 'Kdam Thmor Pro',      googleFamily: 'Kdam Thmor Pro',      query: 'Kdam+Thmor+Pro',                   category: 'Sans' },
  'konkhmer-sleokchher': { name: 'Konkhmer Sleokchher', googleFamily: 'Konkhmer Sleokchher', query: 'Konkhmer+Sleokchher',              category: 'Display' },
  'suwannaphum':         { name: 'Suwannaphum',         googleFamily: 'Suwannaphum',         query: 'Suwannaphum:wght@400;700',         category: 'Serif' },
  'content':             { name: 'Content',             googleFamily: 'Content',             query: 'Content:wght@400;700',             category: 'Sans' },
  'koulen':              { name: 'Koulen',              googleFamily: 'Koulen',              query: 'Koulen',                           category: 'Display' },
  'dangrek':             { name: 'Dangrek',             googleFamily: 'Dangrek',             query: 'Dangrek',                          category: 'Display' },
  'moul':                { name: 'Moul',                googleFamily: 'Moul',                query: 'Moul',                             category: 'Display' },
  'moulpali':            { name: 'Moulpali',            googleFamily: 'Moulpali',            query: 'Moulpali',                         category: 'Display' },
  'preahvihear':         { name: 'Preahvihear',         googleFamily: 'Preahvihear',         query: 'Preahvihear',                      category: 'Serif' },
  'bayon':               { name: 'Bayon',               googleFamily: 'Bayon',               query: 'Bayon',                            category: 'Display' },
  'bokor':               { name: 'Bokor',               googleFamily: 'Bokor',               query: 'Bokor',                            category: 'Display' },
  'chenla':              { name: 'Chenla',              googleFamily: 'Chenla',              query: 'Chenla',                           category: 'Serif' },
  'freehand':            { name: 'Freehand',            googleFamily: 'Freehand',            query: 'Freehand',                         category: 'Handwriting' },
  'fasthand':            { name: 'Fasthand',            googleFamily: 'Fasthand',            query: 'Fasthand',                         category: 'Handwriting' },
  'taprom':              { name: 'Taprom',              googleFamily: 'Taprom',              query: 'Taprom',                           category: 'Display' },
  'odor-mean-chey':      { name: 'Odor Mean Chey',      googleFamily: 'Odor Mean Chey',      query: 'Odor+Mean+Chey',                   category: 'Display' },
  'angkor':              { name: 'Angkor',              googleFamily: 'Angkor',              query: 'Angkor',                           category: 'Display' },
  'metal':               { name: 'Metal',               googleFamily: 'Metal',               query: 'Metal',                            category: 'Display' },
};

export const ALL_KHMER_GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?' +
  Object.values(KHMER_FONTS).map((f) => `family=${f.query}`).join('&') +
  '&display=swap';

export const NAV_STYLES: Record<NavStyleId, { name: string; short: string; desc: string }> = {
  pill:    { name: 'Floating Pill', short: 'Pill',    desc: 'Rounded capsule' },
  classic: { name: 'Classic Bar',   short: 'Classic', desc: 'Full-width docked' },
  card:    { name: 'Solid Dock',    short: 'Dock',    desc: 'Filled active tab' },
  minimal: { name: 'Minimal',       short: 'Minimal', desc: 'Clean icons & dot' },
};

export const ACCENT_COLORS: Record<AccentId, { name: string; short: string; primary: string; dark: string }> = {
  blue:    { name: 'Royal Blue',      short: 'Blue',   primary: '#2563EB', dark: '#1D4ED8' },
  purple:  { name: 'Electric Purple', short: 'Purple', primary: '#7C3AED', dark: '#6D28D9' },
  emerald: { name: 'Emerald Mint',    short: 'Mint',   primary: '#059669', dark: '#047857' },
  orange:  { name: 'Sunset Orange',   short: 'Orange', primary: '#EA580C', dark: '#C2410C' },
  rose:    { name: 'Neon Rose',       short: 'Rose',   primary: '#E11D48', dark: '#BE123C' },
  slate:   { name: 'Midnight Slate',  short: 'Slate',  primary: '#334155', dark: '#0F172A' },
};

export const BG_THEMES: Record<BgThemeId, { name: string; subtitle: string; short: string; preview: string; isDark: boolean }> = {
  white: { name: 'Pure White',  subtitle: 'Clean & Bright',        short: 'White', preview: '#FFFFFF', isDark: false },
  clay:  { name: 'Clay Dim',    subtitle: 'Soft Ceramic',          short: 'Dim',   preview: '#F1F5F9', isDark: false },
  cream: { name: 'Warm Cream',  subtitle: 'Paper & Linen',         short: 'Cream', preview: '#FAF7F2', isDark: false },
  manga: { name: 'Manga UI',    subtitle: 'Ink & Screentone',      short: 'Manga', preview: 'linear-gradient(135deg, #000000 50%, #FFFFFF 50%)', isDark: false },
  bento: { name: 'Bento Grid',  subtitle: 'Modular Frosted Glass', short: 'Bento', preview: 'linear-gradient(135deg, #27272A 0%, #09090B 100%)', isDark: true },
  dark:  { name: 'Dark Slate',  subtitle: 'Modern Charcoal',       short: 'Slate', preview: '#0F172A', isDark: true },
  black: { name: 'OLED Black',  subtitle: 'Pitch Dark',            short: 'Black', preview: '#000000', isDark: true },
};

interface UIState {
  theme: BgThemeId;
  accent: AccentId;
  navStyle: NavStyleId;
  khmerFont: KhmerFontId;
  chatWallpaper: ChatWallpaperId;
  chatWallpaperImage: string | null;
  chatWallpaperDim: number;
  chatWallpaperBlur: boolean;
  fontSize: number;
  language: string;
  notifySound: boolean;
  notifyVibration: boolean;
  notifyPreview: boolean;
  lastSeenPrivacy: 'everybody' | 'contacts' | 'nobody';
  autoDownloadPhotos: boolean;
  autoDownloadVideos: boolean;
  sidebarOpen: boolean;
  activeCallId: number | null;
  activeCallName: string;
  setTheme: (t: BgThemeId) => void;
  setAccent: (a: AccentId) => void;
  setNavStyle: (s: NavStyleId) => void;
  setKhmerFont: (f: KhmerFontId) => void;
  setChatWallpaper: (w: ChatWallpaperId) => void;
  setChatWallpaperImage: (img: string | null) => void;
  setChatWallpaperDim: (dim: number) => void;
  setChatWallpaperBlur: (blur: boolean) => void;
  setFontSize: (s: number) => void;
  setLanguage: (l: string) => void;
  setNotify: (k: 'notifySound' | 'notifyVibration' | 'notifyPreview', v: boolean) => void;
  setLastSeenPrivacy: (p: 'everybody' | 'contacts' | 'nobody') => void;
  setAutoDownload: (k: 'autoDownloadPhotos' | 'autoDownloadVideos', v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  setActiveCall: (id: number | null, name?: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'black',
      accent: 'purple',
      navStyle: 'pill',
      khmerFont: 'hanuman',
      chatWallpaper: 'default',
      chatWallpaperImage: null,
      chatWallpaperDim: 20,
      chatWallpaperBlur: false,
      fontSize: 14,
      language: 'English',
      notifySound: true,
      notifyVibration: true,
      notifyPreview: true,
      lastSeenPrivacy: 'everybody',
      autoDownloadPhotos: true,
      autoDownloadVideos: false,
      sidebarOpen: false,
      activeCallId: null,
      activeCallName: '',
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setNavStyle: (navStyle) => set({ navStyle }),
      setKhmerFont: (khmerFont) => set({ khmerFont }),
      setChatWallpaper: (chatWallpaper) => set({ chatWallpaper }),
      setChatWallpaperImage: (chatWallpaperImage) => set({ chatWallpaperImage }),
      setChatWallpaperDim: (chatWallpaperDim) => set({ chatWallpaperDim }),
      setChatWallpaperBlur: (chatWallpaperBlur) => set({ chatWallpaperBlur }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLanguage: (language) => set({ language }),
      setNotify: (k, v) => set({ [k]: v } as Partial<UIState>),
      setLastSeenPrivacy: (lastSeenPrivacy) => set({ lastSeenPrivacy }),
      setAutoDownload: (k, v) => set({ [k]: v } as Partial<UIState>),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setActiveCall: (activeCallId, activeCallName = '') => set({ activeCallId, activeCallName }),
    }),
    {
      name: 'tg-ui',
      partialize: (s) => ({
        theme: s.theme,
        accent: s.accent,
        navStyle: s.navStyle,
        khmerFont: s.khmerFont,
        chatWallpaper: s.chatWallpaper,
        chatWallpaperImage: s.chatWallpaperImage,
        chatWallpaperDim: s.chatWallpaperDim,
        chatWallpaperBlur: s.chatWallpaperBlur,
        fontSize: s.fontSize,
        language: s.language,
        notifySound: s.notifySound,
        notifyVibration: s.notifyVibration,
        notifyPreview: s.notifyPreview,
        lastSeenPrivacy: s.lastSeenPrivacy,
        autoDownloadPhotos: s.autoDownloadPhotos,
        autoDownloadVideos: s.autoDownloadVideos,
      }),
    }
  )
);
