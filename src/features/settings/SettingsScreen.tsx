'use client';
import { TelegramTicks } from '@/components/ui/TelegramTicks';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AtSign,
  Bell,
  Camera,
  Check,
  ChevronRight,
  Database,
  Globe,
  Hash,
  HelpCircle,
  Image as ImageIcon,
  LogOut,
  Palette,
  Pencil,
  Phone,
  QrCode,
  Shield,
  Trash2,
  Type,
  Upload,
  Eye,
  EyeOff,
  Key,
  ExternalLink,
  AlertCircle,
  Bot,
} from 'lucide-react';
import { AI_PERSONAS, getPersonaConfig } from '@/services/aiCall/personas';
import type { AIPersona } from '@/services/aiCall/types';
import { usePersonaStore } from '@/store/persona.store';
import { CustomPersonaManager } from '@/components/ai/CustomPersonaManager';
import { Avatar }      from '@/components/ui/Avatar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button }      from '@/components/ui/Button';
import { ChatWallpaperLayer } from '@/components/ui/ChatWallpaperLayer';
import { Input }       from '@/components/ui/Input';
import { toast }       from '@/components/ui/Toast';
import { useAuthStore } from '@/store/auth.store';
import { ALL_KHMER_GOOGLE_FONTS_URL, ACCENT_COLORS, BG_THEMES, CHAT_WALLPAPERS, KHMER_FONTS, NAV_STYLES, useUIStore, type AccentId, type BgThemeId, type ChatWallpaperId, type KhmerFontId, type NavStyleId } from '@/store/ui.store';
import { fetchRealProfile, isMTProtoConfigured, updateRealProfile } from '@/services/telegram.real';
import { call } from '@/core/telegram/mtproto.client';
import { logOut } from '@/services/auth.real';

type PanelId = 'notifications' | 'privacy' | 'storage' | 'appearance' | 'wallpaper' | 'khmerFont' | 'language' | 'github' | 'aiCall' | 'cloudflare' | 'help' | null;

const LANGUAGES = ['English', 'ភាសាខ្មែរ', '日本語', '한국어', '中文'];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-tg-blue' : 'bg-tg-border'}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { reset, userId } = useAuthStore();
  const ui = useUIStore();

  const [name, setName] = useState('Account');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [profileId, setProfileId] = useState<number>(0);
  const [profileAccessHash, setProfileAccessHash] = useState('0');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoId, setPhotoId] = useState<string | undefined>(undefined);
  const [avatarColor, setAvatarColor] = useState('#2563EB');
  const [editOpen, setEditOpen] = useState(false);
  const [panel, setPanel] = useState<PanelId>(null);
  const [showCustomPersonas, setShowCustomPersonas] = useState(false);
  const { customs: customPersonas } = usePersonaStore();
  const [savingProfile, setSavingProfile] = useState(false);
  const [fontSearch, setFontSearch] = useState('');
  const safeKhmerFont: KhmerFontId = KHMER_FONTS[ui.khmerFont] ? ui.khmerFont : 'hanuman';

  const [githubUsername, setGithubUsername] = useState('dara-tech');
  const [githubToken, setGithubToken] = useState('');
  const [erpApiUrl, setErpApiUrl] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [testingToken, setTestingToken] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tg_calendar_sync_config_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.githubUsername) {
          setGithubUsername(parsed.githubUsername);
        } else if (parsed.githubRepo) {
          setGithubUsername(parsed.githubRepo.split('/')[0]);
        }
        if (parsed.githubToken) setGithubToken(parsed.githubToken);
        if (parsed.erpApiUrl) setErpApiUrl(parsed.erpApiUrl);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (panel !== 'khmerFont') return;
    const id = 'tg-all-khmer-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = ALL_KHMER_GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    }
  }, [panel]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('tg-my-profile');
      if (cached) {
        const p = JSON.parse(cached) as {
          id?: number;
          accessHash?: string;
          name?: string;
          username?: string;
          phone?: string;
          bio?: string;
          hasPhoto?: boolean;
          photoId?: string;
          color?: string;
        };
        if (p.id) setProfileId(p.id);
        if (p.accessHash) setProfileAccessHash(p.accessHash);
        if (p.name) setName(p.name);
        if (p.username !== undefined) setUsername(p.username);
        if (p.phone !== undefined) setPhone(p.phone);
        if (p.bio !== undefined) setBio(p.bio);
        if (p.hasPhoto !== undefined) setHasPhoto(p.hasPhoto);
        if (p.photoId) setPhotoId(p.photoId);
        if (p.color) setAvatarColor(p.color);
      }
    } catch {}

    if (!isMTProtoConfigured()) return;
    let cancelled = false;
    const load = () =>
      fetchRealProfile('me').then((p) => {
        if (cancelled) return;
        setProfileId(p.id);
        setProfileAccessHash(p.accessHash);
        setName(p.name);
        setUsername(p.username);
        setPhone(p.phone);
        setBio(p.bio);
        setHasPhoto(p.hasPhoto);
        setPhotoId(p.photoId);
        setAvatarColor(p.color);
        try {
          localStorage.setItem('tg-my-profile', JSON.stringify({
            id: p.id,
            accessHash: p.accessHash,
            name: p.name,
            username: p.username,
            phone: p.phone,
            bio: p.bio,
            hasPhoto: p.hasPhoto,
            photoId: p.photoId,
            color: p.color,
          }));
        } catch {}
      });

    load().catch(() => {
      setTimeout(() => { if (!cancelled) load().catch(() => {}); }, 1500);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast('Display name cannot be empty', 'error');
      return;
    }
    setSavingProfile(true);
    if (isMTProtoConfigured()) {
      try {
        const [first, ...rest] = name.trim().split(' ');
        await updateRealProfile(first || '', rest.join(' '), bio);
        try {
          localStorage.setItem('tg-my-profile', JSON.stringify({ name: name.trim(), username, phone, bio }));
        } catch {}
        toast('Profile updated', 'success');
        setEditOpen(false);
      } catch (e: unknown) {
        const err = e as { error_message?: string; message?: string };
        toast(err?.error_message || err?.message || 'Failed to update profile', 'error');
      } finally {
        setSavingProfile(false);
      }
    } else {
      toast('Profile updated locally', 'success');
      setSavingProfile(false);
      setEditOpen(false);
    }
  };

  const handlePrivacyChange = async (val: 'everybody' | 'contacts' | 'nobody') => {
    ui.setLastSeenPrivacy(val);
    if (!isMTProtoConfigured()) return;
    const rule =
      val === 'everybody'
        ? { _: 'inputPrivacyValueAllowAll' }
        : val === 'contacts'
        ? { _: 'inputPrivacyValueAllowContacts' }
        : { _: 'inputPrivacyValueDisallowAll' };
    try {
      await call('account.setPrivacy', {
        key: { _: 'inputPrivacyKeyStatusTimestamp' },
        rules: [rule],
      });
      toast('Privacy updated', 'success');
    } catch {
      toast('Saved locally', 'info');
    }
  };

  const handleClearCache = async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    toast('Cache cleared', 'success');
    setPanel(null);
  };

  const handleLogout = async () => {
    if (isMTProtoConfigured()) {
      await logOut().catch(() => {});
    }
    reset();
    router.replace('/auth');
  };

  const handleTestGithub = async () => {
    setTestingToken(true);
    setTokenStatus(null);
    try {
      const userToTest = githubUsername.trim().replace(/^@/, '') || 'dara-tech';
      const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
      if (githubToken.trim()) {
        const t = githubToken.trim();
        headers.Authorization = t.startsWith('github_pat_') || t.startsWith('ghp_') ? `Bearer ${t}` : `token ${t}`;
      }
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(userToTest)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const displayName = data.name ? ` (${data.name})` : '';
        setTokenStatus({
          ok: true,
          message: `Connected to @${data.login}${displayName} with ${data.public_repos ?? 0} repositories!`,
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setTokenStatus({ ok: false, message: `GitHub error: ${err.message || res.statusText}` });
      }
    } catch (e: any) {
      setTokenStatus({ ok: false, message: `Connection failed: ${e.message || 'Network error'}` });
    } finally {
      setTestingToken(false);
    }
  };

  const handleSaveGithubSettings = () => {
    try {
      const raw = localStorage.getItem('tg_calendar_sync_config_v2');
      const existing = raw ? JSON.parse(raw) : {};
      const userClean = githubUsername.trim().replace(/^@/, '') || 'dara-tech';
      const updated = {
        ...existing,
        githubUsername: userClean,
        githubRepo: `${userClean}/tg`,
        githubToken: githubToken.trim(),
        erpApiUrl: erpApiUrl.trim(),
      };
      localStorage.setItem('tg_calendar_sync_config_v2', JSON.stringify(updated));
      toast('GitHub & ERP configuration saved', 'success');
      setPanel(null);
    } catch {
      toast('Failed to save settings', 'error');
    }
  };

  const safeTheme = BG_THEMES[ui.theme] ? ui.theme : 'black';
  const safeAccent = ACCENT_COLORS[ui.accent] ? ui.accent : 'purple';
  const safeNavStyle = NAV_STYLES[ui.navStyle] ? ui.navStyle : 'minimal';

  return (
    <div className="flex flex-col h-full bg-tg-bg-tertiary">
      {/* Header matching Screenshot 8 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-3 safe-top bg-tg-bg-tertiary">
        <h1 className="text-tg-text text-[30px] font-bold tracking-tight">Profile</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/qr-scan')}
            className="w-9 h-9 rounded-full bg-tg-bg-secondary border border-tg-border/40 flex items-center justify-center text-tg-text-secondary active:scale-95"
            aria-label="Scan QR"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="w-9 h-9 rounded-full bg-tg-bg-secondary border border-tg-border/40 flex items-center justify-center text-tg-text-secondary active:scale-95"
            aria-label="Edit profile"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 space-y-4 pb-4">
        {/* Profile Hero Card */}
        <button
          onClick={() => setEditOpen(true)}
          className="w-full bg-tg-bg-secondary border border-tg-border/35 shadow-sm rounded-2xl p-4 flex items-center gap-3.5 text-left active:bg-tg-surface transition-colors"
        >
          <Avatar
            letters={name.slice(0, 2).toUpperCase()}
            color={avatarColor}
            size="lg"
            peerType="user"
            peerId={profileId || userId || undefined}
            accessHash={profileAccessHash}
            hasPhoto={hasPhoto}
            photoId={photoId}
          />
          <div className="flex-1 min-w-0">
            <p className="text-tg-text text-base font-bold truncate">{name}</p>
            <p className="text-tg-text-secondary text-xs truncate">
              {[phone, username ? `@${username.replace(/^@/, '')}` : ''].filter(Boolean).join(' · ') || 'Tap to edit profile'}
            </p>
            {bio && <p className="text-tg-text-hint text-xs truncate mt-0.5">{bio}</p>}
          </div>
          <div className="w-8 h-8 rounded-full bg-tg-surface flex items-center justify-center text-tg-text-hint shrink-0">
            <Pencil className="w-4 h-4" />
          </div>
        </button>

        {/* Inline Accent Color + 5 Background Themes Card (Screenshot 8) */}
        <div className="bg-tg-bg-secondary border border-tg-border/20 shadow-sm rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-tg-blue/20 text-tg-blue flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <p className="text-tg-text text-sm font-semibold">Accent Color</p>
                <p className="text-tg-blue text-xs">{ACCENT_COLORS[safeAccent].name}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold">
              Active
            </span>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {(Object.keys(ACCENT_COLORS) as AccentId[]).map((id) => {
              const active = safeAccent === id;
              return (
                <button
                  key={id}
                  onClick={() => ui.setAccent(id)}
                  className="flex flex-col items-center gap-1 focus:outline-none"
                >
                  <div
                    className={`w-10 h-10 rounded-full p-[2px] flex items-center justify-center transition-all ${
                      active ? 'border-2 border-[#2A82DA] scale-105 shadow-sm' : 'border border-transparent'
                    }`}
                  >
                    <div
                      className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative shadow-inner"
                      style={{ backgroundColor: ACCENT_COLORS[id].primary }}
                    >
                      {active && (
                        <div className="w-4 h-4 rounded-full bg-white/30 backdrop-blur-sm text-white flex items-center justify-center shadow-sm">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] ${active ? 'text-[#2A82DA] font-semibold' : 'text-tg-text-hint'}`}>
                    {ACCENT_COLORS[id].short}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-tg-border/20 space-y-2.5">
            <div>
              <p className="text-tg-text text-sm font-semibold">Background Theme</p>
              <p className="text-tg-text-hint text-xs">{BG_THEMES[safeTheme].name} · {BG_THEMES[safeTheme].subtitle}</p>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {(Object.keys(BG_THEMES) as BgThemeId[]).map((id) => {
                const active = safeTheme === id;
                const t = BG_THEMES[id];
                return (
                  <button
                    key={id}
                    onClick={() => ui.setTheme(id)}
                    className="flex flex-col items-center gap-1.5 focus:outline-none"
                  >
                    <div
                      className={`w-10 h-10 rounded-full p-[2px] flex items-center justify-center transition-all ${
                        active
                          ? 'border-2 border-[#2A82DA] scale-105 shadow-sm'
                          : 'border border-tg-border/30 hover:border-tg-border/60'
                      }`}
                    >
                      <div
                        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative shadow-inner"
                        style={{ background: t.preview }}
                      >
                        {active && (
                          <div className="w-4 h-4 rounded-full bg-[#2A82DA] text-white flex items-center justify-center shadow-md">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] ${active ? 'text-[#2A82DA] font-semibold' : 'text-tg-text-hint'}`}>
                      {t.short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-tg-border/20 space-y-2.5">
            <div>
              <p className="text-tg-text text-sm font-semibold">Navigation Bar Style</p>
              <p className="text-tg-text-hint text-xs">{NAV_STYLES[safeNavStyle].name} · {NAV_STYLES[safeNavStyle].desc}</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(NAV_STYLES) as NavStyleId[]).map((id) => {
                const active = safeNavStyle === id;
                const s = NAV_STYLES[id];
                return (
                  <button
                    key={id}
                    onClick={() => ui.setNavStyle(id)}
                    className="flex flex-col items-center gap-1.5 focus:outline-none"
                  >
                    <div
                      className={`w-full h-10 rounded-xl bg-tg-bg-tertiary flex items-end justify-center p-1.5 transition-all ${
                        active
                          ? 'border-2 border-[#2A82DA] shadow-sm'
                          : 'border border-tg-border/30 hover:border-tg-border/60'
                      }`}
                    >
                      {id === 'pill' && (
                        <div className="w-full h-3.5 rounded-full bg-tg-bg-secondary border border-tg-border/30 flex items-center justify-around px-1">
                          <span className="w-2.5 h-1.5 rounded-full bg-tg-blue" />
                          <span className="w-1.5 h-1 rounded-full bg-tg-text-hint/50" />
                          <span className="w-1.5 h-1 rounded-full bg-tg-text-hint/50" />
                        </div>
                      )}
                      {id === 'classic' && (
                        <div className="w-full h-3 border-t border-tg-border/30 bg-tg-bg-secondary flex items-center justify-around px-1">
                          <span className="w-2 h-1.5 rounded-sm bg-tg-blue" />
                          <span className="w-1.5 h-1 rounded-sm bg-tg-text-hint/50" />
                          <span className="w-1.5 h-1 rounded-sm bg-tg-text-hint/50" />
                        </div>
                      )}
                      {id === 'card' && (
                        <div className="w-full h-3.5 rounded-md bg-tg-bg-secondary border border-tg-border/30 flex items-center justify-around px-0.5">
                          <span className="w-3 h-2 rounded-sm bg-tg-blue" />
                          <span className="w-1.5 h-1 rounded-sm bg-tg-text-hint/50" />
                          <span className="w-1.5 h-1 rounded-sm bg-tg-text-hint/50" />
                        </div>
                      )}
                      {id === 'minimal' && (
                        <div className="w-full h-3.5 rounded-t-none rounded-b-md border border-tg-border/30 bg-tg-bg-secondary flex items-center justify-around px-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30]" />
                          <span className="w-1 h-1 rounded-full bg-tg-text-hint/40" />
                          <span className="w-1 h-1 rounded-full bg-tg-text-hint/40" />
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] ${active ? 'text-tg-blue font-semibold' : 'text-tg-text-hint'}`}>
                      {s.short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ACCOUNT section */}
        <div>
          <p className="text-tg-text-hint text-[13px] font-normal uppercase px-4 mb-2 tracking-tight">Account</p>
          <div className="bg-tg-bg-secondary border border-tg-border/25 shadow-sm rounded-2xl overflow-hidden">
            <button onClick={() => router.push('/profile/me')} className="w-full px-4 py-3 flex items-center justify-between active:bg-tg-surface transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                  <Avatar letters={name.slice(0, 2).toUpperCase()} color="transparent" size="sm" />
                </div>
                <span className="text-tg-text text-[15px] font-medium">Name</span>
              </div>
              <span className="text-tg-text-secondary text-[15px]">{name}</span>
            </button>
            <div className="ml-14 border-b border-tg-border/20" />
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white shrink-0">
                  <AtSign className="w-4 h-4" />
                </div>
                <span className="text-tg-text text-[15px] font-medium">Username</span>
              </div>
              <span className="text-tg-text-secondary text-[15px]">{username || 'Not set'}</span>
            </div>
            <div className="ml-14 border-b border-tg-border/20" />
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white shrink-0">
                  <Hash className="w-4 h-4" />
                </div>
                <span className="text-tg-text text-[15px] font-medium">User ID</span>
              </div>
              <span className="text-tg-text-secondary text-[15px]">#{userId ?? 0}</span>
            </div>
            {phone && (
              <>
                <div className="ml-14 border-b border-tg-border/20" />
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span className="text-tg-text text-[15px] font-medium">Phone</span>
                  </div>
                  <span className="text-tg-text-secondary text-[15px]">{phone}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* PREFERENCES */}
        <div>
          <p className="text-tg-text-hint text-[13px] font-normal uppercase px-4 mb-2 tracking-tight">Preferences</p>
          <div className="bg-tg-bg-secondary border border-tg-border/25 shadow-sm rounded-2xl overflow-hidden">
            {[
              { id: 'notifications' as const, bg: 'bg-amber-500',   icon: <Bell className="w-4 h-4 text-white" />,       label: 'Notifications & Sounds', desc: ui.notifySound ? 'On' : 'Muted' },
              { id: 'privacy'       as const, bg: 'bg-emerald-500', icon: <Shield className="w-4 h-4 text-white" />,     label: 'Privacy & Security',     desc: ui.lastSeenPrivacy },
              { id: 'storage'       as const, bg: 'bg-cyan-500',    icon: <Database className="w-4 h-4 text-white" />,   label: 'Data & Storage',         desc: ui.autoDownloadPhotos ? 'Auto' : 'Manual' },
              { id: 'wallpaper'     as const, bg: 'bg-pink-500',    icon: <ImageIcon className="w-4 h-4 text-white" />,  label: 'Chat Wallpaper',         desc: ui.chatWallpaper === 'custom' ? 'Custom Image' : (CHAT_WALLPAPERS[ui.chatWallpaper]?.name ?? 'Theme Default') },
              { id: 'khmerFont'     as const, bg: 'bg-violet-500',  icon: <Type className="w-4 h-4 text-white" />,       label: 'Khmer Font',             desc: KHMER_FONTS[safeKhmerFont].name },
              { id: 'aiCall'        as const, bg: 'bg-transparent', icon: <img src="/icons/ai-brain.png" alt="AI" className="w-8 h-8 object-contain" />, label: 'AI Voice Calling', desc: AI_PERSONAS[ui.aiPersona as AIPersona]?.name || 'Telegram AI' },
              { id: 'cloudflare'    as const, bg: 'bg-sky-600',     icon: <Bot className="w-4 h-4 text-white" />,        label: 'Cloudflare AI',          desc: ui.cfAccountId ? 'Configured' : 'Not configured' },
              { id: 'github'        as const, bg: 'bg-purple-600',  icon: <Key className="w-4 h-4 text-white" />,        label: 'GitHub & ERP Integration', desc: githubToken ? 'Connected' : (githubUsername ? `@${githubUsername.replace(/^@/, '')}` : 'Configure') },
              { id: 'language'      as const, bg: 'bg-indigo-500',  icon: <Globe className="w-4 h-4 text-white" />,      label: 'Language',               desc: ui.language },
              { id: 'help'          as const, bg: 'bg-slate-500',   icon: <HelpCircle className="w-4 h-4 text-white" />, label: 'Help & FAQ',             desc: '' },
            ].map((item, idx, arr) => (
              <div key={item.id}>
                <button
                  onClick={() => setPanel(item.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 active:bg-tg-surface text-left transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center shrink-0`}>
                    {item.icon}
                  </div>
                  <span className="text-tg-text text-[15px] font-medium flex-1">{item.label}</span>
                  {item.desc && <span className="text-tg-text-hint text-xs capitalize mr-1">{item.desc}</span>}
                  <ChevronRight className="w-4 h-4 text-tg-text-hint/60 shrink-0" />
                </button>
                {idx < arr.length - 1 && <div className="ml-14 border-b border-tg-border/20" />}
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
        >
          <span>Log Out</span>
        </button>
      </div>

      {/* Edit Profile */}
      <BottomSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Profile"
        description="Update your photo, name and bio"
        maxWidth="sm:max-w-md"
      >
        <div className="p-5 space-y-4">
          {/* Avatar / Photo preview */}
          <div className="flex flex-col items-center justify-center gap-2 pt-1 pb-1">
            <div className="relative group">
              <Avatar
                letters={name.trim().slice(0, 2).toUpperCase() || 'ME'}
                size="xl"
                className="shadow-md border-2 border-tg-border"
              />
              <label
                className="absolute -bottom-1 -right-1 p-2 rounded-full bg-tg-blue text-white shadow-lg cursor-pointer hover:bg-tg-blue-dark active:scale-95 transition-all"
                title="Change Photo"
              >
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      toast('Profile photo selected', 'info');
                    }
                  }}
                />
              </label>
            </div>
            <span className="text-xs text-tg-text-secondary font-medium">Change Profile Photo</span>
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <Input
                label="Display Name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
              />
              <p className="text-[11px] text-tg-text-hint mt-1 px-1">
                This name will be displayed in your chats and contacts.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-tg-text-secondary text-sm">Bio</label>
                <span className="text-[11px] text-tg-text-hint">{bio.length}/70</span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 70))}
                rows={3}
                placeholder="A few words about yourself..."
                className="w-full bg-tg-surface border border-tg-border rounded-xl px-4 py-2.5 text-tg-text placeholder:text-tg-text-hint focus:outline-none focus:border-tg-blue transition-colors text-sm resize-none"
              />
              <p className="text-[11px] text-tg-text-hint mt-1 px-1">
                Any details such as age, occupation or city. Example: 23 y.o. designer from San Francisco.
              </p>
            </div>

            {/* Read-only account info */}
            {(username || phone) && (
              <div className="bg-tg-surface/60 border border-tg-border/60 rounded-xl p-3 space-y-1.5 text-xs">
                {username && (
                  <div className="flex items-center justify-between text-tg-text-secondary">
                    <span>Username</span>
                    <span className="text-tg-text font-medium">{username.startsWith('@') ? username : `@${username}`}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center justify-between text-tg-text-secondary">
                    <span>Phone</span>
                    <span className="text-tg-text font-medium">{phone}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveProfile}
              loading={savingProfile}
              className="flex-1"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Live Preview Appearance Sheet (Screenshot 6) */}
      <BottomSheet open={panel === 'appearance'} onClose={() => setPanel(null)} title="Theme & Appearance" maxWidth="sm:max-w-md">
        <div className="p-5 space-y-4">
          <div className="bg-tg-bg-tertiary border border-tg-border rounded-2xl p-3 space-y-2">
            <div className="flex justify-start">
              <div className="bg-tg-bg-secondary border border-tg-border rounded-2xl rounded-bl-[4px] px-3 py-2 text-xs text-tg-text">
                How do you like this format?
              </div>
            </div>
            <div className="flex justify-end">
              <div className="chat-go-gradient rounded-2xl rounded-br-[4px] px-3 py-2 text-xs text-white flex items-center gap-1">
                <span>Noted</span>
                <span className="text-[10px] text-white/75">11:39</span>
                <TelegramTicks variant="double" className="w-3.5 h-2.5 text-sky-300 shrink-0" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <p className="text-tg-text-secondary text-xs font-semibold uppercase tracking-wider">Text Size</p>
              <span className="text-tg-blue text-xs font-bold">{ui.fontSize}px</span>
            </div>
            <input
              type="range"
              min={12}
              max={18}
              value={ui.fontSize}
              onChange={(e) => ui.setFontSize(Number(e.target.value))}
              className="w-full accent-tg-blue"
            />
          </div>

          <Button onClick={() => setPanel(null)}>Done</Button>
        </div>
      </BottomSheet>

      {/* Notifications Panel */}
      <BottomSheet open={panel === 'notifications'} onClose={() => setPanel(null)} title="Notifications & Sounds" maxWidth="sm:max-w-md">
        <div className="p-5 space-y-3">
          {[
            { key: 'notifySound' as const, label: 'In-App Sounds', val: ui.notifySound },
            { key: 'notifyVibration' as const, label: 'Vibration', val: ui.notifyVibration },
            { key: 'notifyPreview' as const, label: 'Message Preview', val: ui.notifyPreview },
          ].map((row) => (
            <div key={row.key} className="flex items-center justify-between py-2 border-b border-tg-border last:border-0">
              <span className="text-tg-text text-sm">{row.label}</span>
              <Toggle checked={row.val} onChange={(v) => ui.setNotify(row.key, v)} />
            </div>
          ))}
          <Button onClick={() => setPanel(null)}>Done</Button>
        </div>
      </BottomSheet>

      {/* Privacy Panel */}
      <BottomSheet open={panel === 'privacy'} onClose={() => setPanel(null)} title="Last Seen & Online" maxWidth="sm:max-w-md">
        <div className="p-5 space-y-2">
          {(['everybody', 'contacts', 'nobody'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => handlePrivacyChange(opt)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${
                ui.lastSeenPrivacy === opt
                  ? 'border-tg-blue bg-tg-blue/10 text-tg-blue'
                  : 'border-tg-border text-tg-text'
              }`}
            >
              <span className="text-sm font-medium capitalize">{opt === 'everybody' ? 'Everybody' : opt === 'contacts' ? 'My Contacts' : 'Nobody'}</span>
              {ui.lastSeenPrivacy === opt && <span className="text-xs font-bold">Active</span>}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Data & Storage Panel */}
      <BottomSheet open={panel === 'storage'} onClose={() => setPanel(null)} title="Data & Storage" maxWidth="sm:max-w-md">
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-tg-border">
            <span className="text-tg-text text-sm">Auto-download Photos</span>
            <Toggle checked={ui.autoDownloadPhotos} onChange={(v) => ui.setAutoDownload('autoDownloadPhotos', v)} />
          </div>
          <div className="flex items-center justify-between py-2 border-b border-tg-border">
            <span className="text-tg-text text-sm">Auto-download Videos</span>
            <Toggle checked={ui.autoDownloadVideos} onChange={(v) => ui.setAutoDownload('autoDownloadVideos', v)} />
          </div>
          <Button variant="danger" onClick={handleClearCache}>
            <Trash2 className="w-4 h-4" />
            <span>Clear Cache</span>
          </Button>
        </div>
      </BottomSheet>

      {/* Chat Wallpaper Panel */}
      <BottomSheet
        open={panel === 'wallpaper'}
        onClose={() => setPanel(null)}
        title="Chat Wallpaper"
        description="Choose a preset pattern or upload your own photo"
        maxWidth="sm:max-w-md"
      >
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-hide">
          {/* Live Chat Wallpaper Preview */}
          <div className="relative h-36 rounded-2xl overflow-hidden border border-tg-border/35 bg-tg-bg-tertiary p-3 flex flex-col justify-end gap-2">
            <ChatWallpaperLayer
              wallpaper={ui.chatWallpaper}
              customImage={ui.chatWallpaperImage}
              dim={ui.chatWallpaper === 'default' ? 0 : ui.chatWallpaperDim}
              blur={ui.chatWallpaperBlur}
            />
            <div className="relative z-10 flex justify-start">
              <div className="bg-tg-bg-secondary/95 border border-tg-border/35 rounded-2xl rounded-bl-[4px] px-3 py-1.5 text-xs text-tg-text shadow-sm">
                Look at this wallpaper!
              </div>
            </div>
            <div className="relative z-10 flex justify-end">
              <div className="chat-go-gradient text-white rounded-2xl rounded-br-[4px] px-3 py-1.5 text-xs shadow-sm flex items-center gap-1.5">
                <span>Clean & sharp</span>
                <TelegramTicks variant="double" className="w-3.5 h-3 text-sky-200 shrink-0" />
              </div>
            </div>
          </div>

          {/* Choose Custom Image Button */}
          <label className="w-full py-2.5 px-4 rounded-xl bg-tg-blue/12 text-tg-blue text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-transform">
            <Upload className="w-4 h-4" />
            <span>Choose Photo from Device</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const img = new Image();
                const objUrl = URL.createObjectURL(file);
                img.onload = () => {
                  const maxSide = 1280;
                  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
                  const canvas = document.createElement('canvas');
                  canvas.width = Math.round(img.width * scale);
                  canvas.height = Math.round(img.height * scale);
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const compressed = canvas.toDataURL('image/jpeg', 0.82);
                    ui.setChatWallpaperImage(compressed);
                    ui.setChatWallpaper('custom');
                    toast('Chat wallpaper updated', 'success');
                  }
                  URL.revokeObjectURL(objUrl);
                };
                img.onerror = () => {
                  URL.revokeObjectURL(objUrl);
                  toast('Could not load image', 'error');
                };
                img.src = objUrl;
              }}
            />
          </label>

          {/* Preset Wallpapers Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            {(Object.keys(CHAT_WALLPAPERS) as Array<Exclude<ChatWallpaperId, 'custom'>>).map((wid) => {
              const w = CHAT_WALLPAPERS[wid];
              const active = ui.chatWallpaper === wid;
              return (
                <button
                  key={wid}
                  onClick={() => ui.setChatWallpaper(wid)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className={`w-full h-16 rounded-xl relative overflow-hidden flex items-center justify-center transition-all ${
                      active
                        ? 'border-2 border-[#2A82DA] shadow-sm'
                        : 'border border-tg-border/40 hover:border-tg-border/70'
                    }`}
                    style={{
                      backgroundImage: w.gradient,
                      backgroundSize: wid === 'manga-screentone' ? '14px 14px' : undefined,
                    }}
                  >
                    {!w.gradient && <span className="text-[11px] text-tg-text-hint">Default</span>}
                    {active && (
                      <div className="w-6 h-6 rounded-full bg-[#2A82DA] text-white flex items-center justify-center shadow">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                  <span className={`text-[11px] truncate w-full text-center ${active ? 'text-[#2A82DA] font-semibold' : 'text-tg-text-hint'}`}>
                    {w.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dim & Blur Controls when wallpaper is active */}
          {ui.chatWallpaper !== 'default' && (
            <div className="bg-tg-surface/70 border border-tg-border/35 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-tg-text text-sm font-medium">Blur Background</span>
                <Toggle checked={ui.chatWallpaperBlur} onChange={ui.setChatWallpaperBlur} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-tg-text-secondary font-medium">Dimming</span>
                  <span className="text-tg-text-hint tabular-nums">{ui.chatWallpaperDim}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={ui.chatWallpaperDim}
                  onChange={(e) => ui.setChatWallpaperDim(Number(e.target.value))}
                  className="w-full accent-tg-blue"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  ui.setChatWallpaper('default');
                  ui.setChatWallpaperImage(null);
                  ui.setChatWallpaperBlur(false);
                  ui.setChatWallpaperDim(20);
                  toast('Reset to default theme background', 'info');
                }}
                className="w-full py-2 rounded-xl text-xs font-semibold text-rose-500 bg-rose-500/10 active:bg-rose-500/20"
              >
                Reset Wallpaper
              </button>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Khmer Font Panel */}
      <BottomSheet
        open={panel === 'khmerFont'}
        onClose={() => { setPanel(null); setFontSearch(''); }}
        title="Khmer Font"
        description="English stays modern Google Sans · Khmer uses your selected Google Font"
        maxWidth="sm:max-w-md"
      >
        <div className="p-4 space-y-3">
          <Input
            placeholder="Search 26 Khmer Google Fonts…"
            value={fontSearch}
            onChange={(e) => setFontSearch(e.target.value)}
          />
          <div className="max-h-[55vh] overflow-y-auto scrollbar-hide space-y-2 pr-0.5">
            {(Object.keys(KHMER_FONTS) as KhmerFontId[])
              .filter((fid) => {
                const q = fontSearch.trim().toLowerCase();
                if (!q) return true;
                const f = KHMER_FONTS[fid];
                return f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
              })
              .map((fid) => {
                const f = KHMER_FONTS[fid];
                const active = safeKhmerFont === fid;
                return (
                  <button
                    key={fid}
                    onClick={() => {
                      ui.setKhmerFont(fid);
                      toast(`Khmer font: ${f.name}`, 'success');
                      setPanel(null);
                      setFontSearch('');
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-colors ${
                      active
                        ? 'border-tg-blue bg-tg-blue/10'
                        : 'border-tg-border bg-tg-bg-secondary active:bg-tg-surface'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${active ? 'text-tg-blue' : 'text-tg-text'}`}>
                          {f.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-tg-surface text-tg-text-hint">
                          {f.category}
                        </span>
                      </div>
                      <p className="text-xs text-tg-text-secondary mt-1 truncate">
                        <span style={{ fontFamily: `"${f.googleFamily}", serif` }}>
                          សួស្តី! ភាសាខ្មែរ
                        </span>
                        <span className="mx-1.5 text-tg-text-hint">·</span>
                        <span className="font-modern">Modern English 123</span>
                      </p>
                    </div>
                    {active && <Check className="w-4 h-4 text-tg-blue shrink-0" />}
                  </button>
                );
              })}
          </div>
        </div>
      </BottomSheet>

      {/* Language Panel */}
      <BottomSheet open={panel === 'language'} onClose={() => setPanel(null)} title="Language" maxWidth="sm:max-w-md">
        <div className="p-5 space-y-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => { ui.setLanguage(lang); toast(`Language: ${lang}`, 'success'); setPanel(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${
                ui.language === lang
                  ? 'border-tg-blue bg-tg-blue/10 text-tg-blue'
                  : 'border-tg-border text-tg-text'
              }`}
            >
              <span className="text-sm font-medium">{lang}</span>
              {ui.language === lang && <span className="text-xs font-bold">Active</span>}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* GitHub & ERP Integration Panel */}
      <BottomSheet
        open={panel === 'github'}
        onClose={() => setPanel(null)}
        title="GitHub & ERP Authentication"
        maxWidth="sm:max-w-md"
      >
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Key className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs text-tg-text-secondary leading-relaxed">
              <span className="font-semibold text-tg-text">Personal Access Token (PAT)</span> enables private repo milestone and issue synchronization with Calendar, plus ERP calendar integration.
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-tg-text uppercase tracking-wider">GitHub Personal Access Token</label>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=Telegram+Web+Calendar+Sync"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-tg-blue hover:underline flex items-center gap-1"
              >
                <span>Generate Token</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={githubToken}
                onChange={(e) => {
                  setGithubToken(e.target.value);
                  setTokenStatus(null);
                }}
                placeholder="ghp_xxxx or github_pat_xxxx (Optional)"
                className="w-full bg-tg-bg border border-tg-border rounded-xl px-3.5 py-2.5 text-sm text-tg-text pr-10 focus:outline-none focus:border-tg-blue font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-tg-text-hint hover:text-tg-text"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-tg-text-hint">
              Optional for public repos. Required for private repositories and higher API rate limits.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tg-text uppercase tracking-wider">GitHub Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-tg-text-hint font-mono font-medium">@</span>
              <input
                type="text"
                value={githubUsername}
                onChange={(e) => {
                  setGithubUsername(e.target.value.replace(/^@/, ''));
                  setTokenStatus(null);
                }}
                placeholder="username (e.g. dara-tech)"
                className="w-full bg-tg-bg border border-tg-border rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-tg-text focus:outline-none focus:border-tg-blue font-mono"
              />
            </div>
            <p className="text-[11px] text-tg-text-hint">
              Synchronizes issues, pull requests, releases, and milestones associated with this GitHub user.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tg-text uppercase tracking-wider">ERP System API Endpoint (Optional)</label>
            <input
              type="url"
              value={erpApiUrl}
              onChange={(e) => setErpApiUrl(e.target.value)}
              placeholder="https://erp.yourdomain.com/api/v1/calendar"
              className="w-full bg-tg-bg border border-tg-border rounded-xl px-3.5 py-2.5 text-sm text-tg-text focus:outline-none focus:border-tg-blue"
            />
            <p className="text-[11px] text-tg-text-hint">
              Enterprise endpoint to retrieve ERP project deadlines and schedules.
            </p>
          </div>

          {tokenStatus && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                tokenStatus.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {tokenStatus.ok ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{tokenStatus.message}</span>
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleTestGithub}
              disabled={testingToken}
              className="flex-1 py-2.5 px-3 rounded-xl border border-tg-border bg-tg-surface text-tg-text text-sm font-medium hover:bg-tg-surface/80 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {testingToken ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="button"
              onClick={handleSaveGithubSettings}
              className="flex-1 py-2.5 px-3 rounded-xl bg-tg-blue text-white text-sm font-semibold hover:bg-tg-blue/90 active:scale-[0.99] transition-all"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* AI Voice Calling Panel */}
      <BottomSheet
        open={panel === 'aiCall'}
        onClose={() => setPanel(null)}
        title="AI Voice Call"
        maxWidth="sm:max-w-md"
      >
        {showCustomPersonas ? (
          <div className="h-[75vh]">
            <CustomPersonaManager onBack={() => setShowCustomPersonas(false)} />
          </div>
        ) : (
          <div className="p-4 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Personas Picker */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-tg-text-hint uppercase tracking-wider px-1">
                Select Companion
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1 pt-1 scrollbar-none">
                {Object.values(AI_PERSONAS).map((p) => {
                  const isSelected = ui.aiPersona === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        ui.setAiPersona(p.id);
                        toast(`${p.name} selected`, 'info');
                      }}
                      className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                    >
                      <div
                        className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold transition-all ${
                          isSelected
                            ? 'ring-2 ring-tg-blue ring-offset-2 ring-offset-tg-bg scale-105'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${p.gradient.from}, ${p.gradient.to})`,
                        }}
                      >
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          p.gradient.initial
                        )}
                      </div>
                      <span className={`text-xs max-w-[64px] truncate text-center ${isSelected ? 'font-bold text-tg-blue' : 'text-tg-text-hint'}`}>
                        {p.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}

                {customPersonas.map((p) => {
                  const isSelected = ui.aiPersona === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        ui.setAiPersona(p.id);
                        toast(`${p.name} selected`, 'info');
                      }}
                      className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                    >
                      <div
                        className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-xl bg-tg-surface border border-tg-border/30 transition-all ${
                          isSelected
                            ? 'ring-2 ring-tg-blue ring-offset-2 ring-offset-tg-bg scale-105'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {p.avatarImage ? (
                          <img src={p.avatarImage} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          p.avatarEmoji
                        )}
                      </div>
                      <span className={`text-xs max-w-[64px] truncate text-center ${isSelected ? 'font-bold text-tg-blue' : 'text-tg-text-hint'}`}>
                        {p.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Characters Row */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-tg-text-hint uppercase tracking-wider px-1">
                Custom Characters
              </p>
              <div className="bg-tg-surface rounded-xl border border-tg-border/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowCustomPersonas(true)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-tg-border/10 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-tg-blue/10 flex items-center justify-center text-tg-blue shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-tg-text">Manage Characters</p>
                      <p className="text-[11px] text-tg-text-hint">Create, edit, or auto-generate with AI</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-tg-text-hint text-xs">
                    <span>{customPersonas.length}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </div>

            {/* Configuration */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-tg-text-hint uppercase tracking-wider px-1">
                Configuration
              </p>
              <div className="bg-tg-surface rounded-xl border border-tg-border/30 divide-y divide-tg-border/20 overflow-hidden">
                {/* Gemini API Key */}
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-tg-text-hint">Gemini API Key (Optional)</label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-tg-blue hover:underline flex items-center gap-0.5"
                    >
                      <span>Get Key</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={ui.aiApiKey || ''}
                      onChange={(e) => ui.setAiApiKey(e.target.value)}
                      placeholder="Default key active"
                      className="w-full bg-transparent border-none text-xs text-tg-text pr-8 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-tg-text-hint hover:text-tg-text p-1"
                    >
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Cloudflare AI Setup Row */}
                <button
                  type="button"
                  onClick={() => setPanel('cloudflare')}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-tg-border/10 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-tg-text">Cloudflare AI</p>
                    <p className="text-[11px] text-tg-text-hint">Account & Token for Flux image generation</p>
                  </div>
                  <div className="flex items-center gap-1 text-tg-text-hint text-xs">
                    <span>{ui.cfAccountId ? 'Configured' : 'Not set'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </div>

            {/* Call Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setPanel(null);
                  ui.startAiCall();
                }}
                className="w-full py-3 px-4 rounded-xl bg-tg-blue text-white text-sm font-semibold active:opacity-80 transition-opacity flex items-center justify-center gap-2 shadow-sm"
              >
                <Phone className="w-4 h-4" />
                <span>Start Voice Call</span>
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Cloudflare AI Panel */}
      <BottomSheet open={panel === 'cloudflare'} onClose={() => setPanel(null)} title="Cloudflare AI" maxWidth="sm:max-w-md">
        <div className="p-4 space-y-4">
          <p className="text-xs text-tg-text-hint leading-relaxed">
            Configure your Cloudflare Workers AI credentials to enable character auto-generation and Flux avatar portraits.
          </p>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-tg-text-hint uppercase tracking-wider">Account ID</label>
            <input
              type="text"
              value={ui.cfAccountId || ''}
              onChange={(e) => ui.setCfAccountId(e.target.value)}
              placeholder="Cloudflare Account ID"
              className="w-full bg-tg-surface border border-tg-border/40 rounded-xl px-3.5 py-2.5 text-xs text-tg-text placeholder:text-tg-text-hint/40 focus:outline-none focus:border-tg-blue font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-tg-text-hint uppercase tracking-wider">API Token</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={ui.cfApiToken || ''}
                onChange={(e) => ui.setCfApiToken(e.target.value)}
                placeholder="Cloudflare API Token"
                className="w-full bg-tg-surface border border-tg-border/40 rounded-xl px-3.5 py-2.5 text-xs text-tg-text placeholder:text-tg-text-hint/40 pr-10 focus:outline-none focus:border-tg-blue font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tg-text-hint hover:text-tg-text"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              toast('Credentials saved');
              setPanel(null);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-tg-blue text-white text-xs font-semibold active:opacity-80 transition-opacity"
          >
            Save Credentials
          </button>
        </div>
      </BottomSheet>

      {/* Help & FAQ Panel */}
      <BottomSheet open={panel === 'help'} onClose={() => setPanel(null)} title="Help & FAQ" maxWidth="sm:max-w-md">
        <div className="p-5 space-y-3">
          <p className="text-tg-text-secondary text-sm leading-relaxed">
            Connected directly to Telegram servers via MTProto WebSocket. Sessions are encrypted and stored locally in your browser.
          </p>
          <a
            href="https://telegram.org/faq"
            target="_blank"
            rel="noreferrer"
            className="block w-full text-center py-3 rounded-xl bg-tg-surface text-tg-blue text-sm font-semibold"
          >
            Open Telegram FAQ
          </a>
        </div>
      </BottomSheet>
    </div>
  );
}
