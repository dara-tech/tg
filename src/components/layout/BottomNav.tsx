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
      />
      {badgeCount > 0 && (
        <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#ff3b30] text-white text-[9px] font-bold leading-none tabular-nums inline-flex items-center justify-center shadow-sm">
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
  const navStyle    = NAV_STYLES[rawNavStyle] ? rawNavStyle : 'minimal';
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
    paddingBottom: 'max(0px, calc(env(safe-area-inset-bottom, 0px) - 14px))',
  };

  const safeWrapperStyle: React.CSSProperties = {
    paddingBottom: 'max(0px, calc(env(safe-area-inset-bottom, 0px) - 14px))',
  };

  /* ── PILL (default) ── */
  if (navStyle === 'pill') {
    return (
      <div className="shrink-0 w-full px-4 pt-0 -mb-1 pointer-events-none z-30" style={safeWrapperStyle}>
        <nav className="max-w-md mx-auto w-full pointer-events-auto bg-tg-bg-secondary border border-tg-border/25 shadow-sm rounded-t-none rounded-b-[38px] overflow-hidden">
          <div className="flex items-stretch justify-around px-3 pt-2 pb-2">
            {TABS.map((tab) => {
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  prefetch
                  className={clsx(
                    'flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 transition-all mx-0.5 border-0 shadow-none',
                    active ? 'bg-tg-blue text-white rounded-2xl' : 'active:bg-tg-surface bg-transparent'
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
      <nav
        className="shrink-0 w-full bg-tg-bg-secondary/85 backdrop-blur-2xl border-t border-tg-border/15 [data-theme='manga']_&:border-t-0 pt-1 "
        style={safeStyle}
      >
        <div className="flex items-stretch justify-around px-2 pb-1">
          {TABS.map(tab => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-xl transition-colors active:bg-tg-surface border-0 shadow-none"
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
    );
  }

  /* ── CARD ── */
  if (navStyle === 'card') {
    return (
      <div className="shrink-0 w-full px-4 pt-0 -mb-1 pointer-events-none z-30" style={safeWrapperStyle}>
        <nav className="max-w-md mx-auto w-full pointer-events-auto bg-tg-bg-secondary border border-tg-border/25 shadow-sm rounded-t-none rounded-b-[38px] overflow-hidden">
          <div className="flex items-stretch justify-around gap-1 px-3 pt-2 pb-2">
            {TABS.map((tab) => {
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  prefetch
                  className={clsx(
                    'flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 transition-all border-0 shadow-none',
                    active ? 'bg-tg-blue text-white rounded-2xl' : 'active:bg-tg-surface bg-transparent'
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
    <div className="shrink-0 w-full px-4 pt-0 -mb-1 pointer-events-none z-30" style={safeWrapperStyle}>
      <nav className="max-w-md mx-auto w-full pointer-events-auto bg-tg-bg-secondary border border-tg-border/25 shadow-sm rounded-t-none rounded-b-[38px] overflow-hidden">
        <div className="flex items-stretch justify-around px-3 pt-2 pb-2.5">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch
                aria-label={tab.label}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 py-1 px-1 transition-all active:scale-95 border-0 shadow-none bg-transparent"
              >
                {renderTabIcon(tab, active, 'text-tg-text', tab.href === '/dialogs' ? totalUnread : 0)}
                <span
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full transition-all duration-200',
                    active ? 'bg-[#ff3b30] scale-100 opacity-100' : 'bg-transparent scale-0 opacity-0'
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
