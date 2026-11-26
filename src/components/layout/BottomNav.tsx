'use client';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { CircleUserRound, MessagesSquare, PhoneCall, UsersRound } from 'lucide-react';
import { useDialogsStore } from '@/store/dialogs.store';
import { NAV_STYLES, useUIStore } from '@/store/ui.store';

const TABS = [
  { href: '/dialogs',  label: 'Chats',   Icon: MessagesSquare  },
  { href: '/contacts', label: 'People',  Icon: UsersRound      },
  { href: '/calls',    label: 'Calls',   Icon: PhoneCall       },
  { href: '/settings', label: 'Profile', Icon: CircleUserRound },
];

function renderTabIcon(
  Icon: typeof MessagesSquare,
  active: boolean,
  activeClass = 'text-tg-blue',
  badgeCount = 0
) {
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
 * - shrink-0 → stays in the flex column, never floats
 * - pt-2 → small top padding for the icons
 * - pb-[env(safe-area-inset-bottom)] → pushes content above the Home Indicator
 *   with NO extra padding on devices without a Home Indicator
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
    pathname === '/';
  if (hide) return null;

  const safeStyle: React.CSSProperties = {
    paddingBottom: 'max(4px, calc(env(safe-area-inset-bottom, 0px) - 10px))',
  };

  /* ── PILL (default) ── */
  if (navStyle === 'pill') {
    return (
      <nav
        className="shrink-0 w-full bg-tg-bg-secondary border-t border-tg-border/50 backdrop-blur-xl pt-1"
        style={safeStyle}
      >
        <div className="flex items-stretch justify-around px-2 pb-1">
          {TABS.map(tab => {
            const active = pathname.startsWith(tab.href);
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className={clsx(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-2xl transition-all mx-0.5',
                  active ? 'bg-tg-blue' : 'active:bg-tg-surface'
                )}
              >
                {renderTabIcon(tab.Icon, active, 'text-white', tab.href === '/dialogs' ? totalUnread : 0)}
                <span className={clsx('text-[10px] font-semibold', active ? 'text-white' : 'text-tg-text-hint')}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  /* ── CLASSIC ── */
  if (navStyle === 'classic') {
    return (
      <nav
        className="shrink-0 w-full bg-tg-bg-secondary/95 backdrop-blur-xl border-t border-tg-border pt-1"
        style={safeStyle}
      >
        <div className="flex items-stretch justify-around px-2 pb-1">
          {TABS.map(tab => {
            const active = pathname.startsWith(tab.href);
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-xl transition-colors active:bg-tg-surface"
              >
                {renderTabIcon(tab.Icon, active, 'text-tg-blue', tab.href === '/dialogs' ? totalUnread : 0)}
                <span className={clsx('text-[10px] font-semibold', active ? 'text-tg-blue' : 'text-tg-text-hint')}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  /* ── CARD ── */
  if (navStyle === 'card') {
    return (
      <nav
        className="shrink-0 w-full bg-tg-bg-secondary border-t border-tg-border/40 backdrop-blur-xl pt-1"
        style={safeStyle}
      >
        <div className="flex items-stretch justify-around gap-1 px-3 pb-1">
          {TABS.map(tab => {
            const active = pathname.startsWith(tab.href);
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className={clsx(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-xl transition-all',
                  active ? 'bg-tg-blue text-white' : 'active:bg-tg-surface'
                )}
              >
                {renderTabIcon(tab.Icon, active, 'text-white', tab.href === '/dialogs' ? totalUnread : 0)}
                <span className={clsx('text-[10px] font-semibold', active ? 'text-white' : 'text-tg-text-hint')}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  /* ── MINIMAL ── */
  return (
    <nav
      className="shrink-0 w-full bg-tg-bg-secondary/88 backdrop-blur-xl border-t border-tg-border/60 pt-1"
      style={safeStyle}
    >
      <div className="flex items-stretch justify-around px-4 pb-1">
        {TABS.map(tab => {
          const active = pathname.startsWith(tab.href);
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              aria-label={tab.label}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl transition-all active:scale-95"
            >
              {renderTabIcon(tab.Icon, active, 'text-tg-blue', tab.href === '/dialogs' ? totalUnread : 0)}
              <span
                className={clsx(
                  'w-1.5 h-1.5 rounded-full transition-all',
                  active ? 'bg-tg-blue scale-100' : 'bg-transparent scale-0'
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
