'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { CircleUserRound, MessagesSquare, Calendar, UsersRound, Bot } from 'lucide-react';
import { useDialogsStore } from '@/store/dialogs.store';
import { NAV_STYLES, useUIStore } from '@/store/ui.store';

const TABS = [
  { href: '/dialogs',  label: 'Chats',    Icon: MessagesSquare  },
  { href: '/contacts', label: 'People',   Icon: UsersRound      },
  { href: '/ai',       label: 'AI Voice', Icon: Bot, customIconSrc: '/icons/ai-brain.png' },
  { href: '/calendar', label: 'Calendar', Icon: Calendar        },
  { href: '/settings', label: 'Profile',  Icon: CircleUserRound },
];

function renderTabIcon(
  tab: (typeof TABS)[number],
  active: boolean,
  activeClass = 'text-tg-blue',
  badgeCount = 0
) {
  if (tab.customIconSrc) {
    return (
      <div className="relative inline-flex items-center justify-center">
        <img
          src={tab.customIconSrc}
          alt={tab.label}
          className={clsx(
            'w-7 h-7 object-contain transition-transform',
            active
              ? 'scale-110 drop-shadow-md brightness-105'
              : 'opacity-80 hover:opacity-100 hover:scale-105'
          )}
        />
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold leading-none tabular-nums inline-flex items-center justify-center">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </div>
    );
  }

  const Icon = tab.Icon;
  return (
    <div className="relative inline-flex items-center justify-center">
      <Icon
        className={clsx('w-6 h-6 transition-transform', active ? `${activeClass} scale-105` : 'text-tg-text-hint')}
        strokeWidth={active ? 2.2 : 1.75}
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.15 : 0}
      />
      {badgeCount > 0 && (
        <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold leading-none tabular-nums inline-flex items-center justify-center">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </div>
  );
}

/**
 * iOS-native-style bottom tab bar.
 * - Uses Next.js <Link prefetch> + eager route prefetching for instant tab switches
 * - shrink-0 stays in the flex column
 * - paddingBottom handles iOS Home Indicator safe area
 */
export function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const rawNavStyle = useUIStore((s) => s.navStyle);
  const navStyle    = NAV_STYLES[rawNavStyle] ? rawNavStyle : 'pill';
  const totalUnread = useDialogsStore((s) =>
    s.dialogs.reduce((acc, d) => acc + (!d.isMuted && d.unreadCount > 0 ? d.unreadCount : 0), 0)
  );

  const hide =
    pathname.startsWith('/chat/') ||
    pathname.startsWith('/profile/') ||
    pathname === '/auth' ||
    pathname === '/' ||
    pathname === '/erp' ||
    pathname === '/bank';

  useEffect(() => {
    if (hide) return;
    TABS.forEach((t) => router.prefetch(t.href));
    router.prefetch('/search');
    router.prefetch('/erp');
  }, [hide, router]);

  if (hide) return null;

  const safeStyle: React.CSSProperties = {
    paddingBottom: 'max(12px, calc(env(safe-area-inset-bottom, 0px) - 6px))',
  };

  /* ── PILL (default) ── */
  if (navStyle === 'pill') {
    return (
      <div className="shrink-0 w-full px-3 pt-1.5 bg-tg-bg" style={safeStyle}>
        <nav className="w-full rounded-[28px] bg-tg-bg-secondary/90 border border-tg-border/20 [data-theme='manga']_&:border-2 [data-theme='manga']_&:border-tg-border backdrop-blur-2xl shadow-lg p-1.5">
          <div className="flex items-stretch justify-around">
            {TABS.map(tab => {
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  prefetch
                  className={clsx(
                    'flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-[22px] transition-all mx-0.5',
                    active ? 'bg-tg-blue' : 'active:bg-tg-surface'
                  )}
                >
                  {renderTabIcon(tab, active, 'text-white', tab.href === '/dialogs' ? totalUnread : 0)}
                  <span className={clsx('text-[10px] font-semibold', active ? 'text-white' : 'text-tg-text-hint')}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  /* ── CLASSIC ── */
  if (navStyle === 'classic') {
    return (
      <div className="shrink-0 w-full px-3 pt-1.5 bg-tg-bg" style={safeStyle}>
        <nav className="w-full rounded-[28px] bg-tg-bg-secondary/90 backdrop-blur-2xl border border-tg-border/20 [data-theme='manga']_&:border-2 [data-theme='manga']_&:border-tg-border shadow-lg p-1.5">
          <div className="flex items-stretch justify-around">
            {TABS.map(tab => {
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  prefetch
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-[22px] transition-colors active:bg-tg-surface"
                >
                  {renderTabIcon(tab, active, 'text-tg-blue', tab.href === '/dialogs' ? totalUnread : 0)}
                  <span className={clsx('text-[10px] font-semibold', active ? 'text-tg-blue' : 'text-tg-text-hint')}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  /* ── CARD ── */
  if (navStyle === 'card') {
    return (
      <div className="shrink-0 w-full px-3 pt-1.5 bg-tg-bg" style={safeStyle}>
        <nav className="w-full rounded-[28px] bg-tg-bg-secondary/90 border border-tg-border/20 [data-theme='manga']_&:border-2 [data-theme='manga']_&:border-tg-border backdrop-blur-2xl shadow-lg p-1.5">
          <div className="flex items-stretch justify-around gap-1">
            {TABS.map(tab => {
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  prefetch
                  className={clsx(
                    'flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-[22px] transition-all',
                    active ? 'bg-tg-blue text-white' : 'active:bg-tg-surface'
                  )}
                >
                  {renderTabIcon(tab, active, 'text-white', tab.href === '/dialogs' ? totalUnread : 0)}
                  <span className={clsx('text-[10px] font-semibold', active ? 'text-white' : 'text-tg-text-hint')}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  /* ── MINIMAL ── */
  return (
    <div className="shrink-0 w-full px-3 pt-1.5 bg-tg-bg" style={safeStyle}>
      <nav className="w-full rounded-[28px] bg-tg-bg-secondary/90 backdrop-blur-2xl border border-tg-border/20 [data-theme='manga']_&:border-2 [data-theme='manga']_&:border-tg-border shadow-lg px-2 py-1.5">
        <div className="flex items-stretch justify-around">
          {TABS.map(tab => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch
                aria-label={tab.label}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-[22px] transition-all active:scale-95"
              >
                {renderTabIcon(tab, active, 'text-tg-blue', tab.href === '/dialogs' ? totalUnread : 0)}
                <span
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full transition-all',
                    active ? 'bg-tg-blue scale-100' : 'bg-transparent scale-0'
                  )}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
