'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import ChatListScreen from '@/features/chat-list/ChatListScreen';
import ContactsScreen from '@/features/contacts/ContactsScreen';
import CalendarScreen from '@/features/calendar/CalendarScreen';
import SettingsScreen from '@/features/settings/SettingsScreen';
import AiScreen from '@/features/ai/AiScreen';

const TAB_PATHS = ['/dialogs', '/contacts', '/ai', '/calendar', '/settings'] as const;
type TabPath = (typeof TAB_PATHS)[number];

function matchTab(pathname: string, isAuthorized: boolean): TabPath | null {
  if (pathname === '/' && isAuthorized) return '/dialogs';
  for (const p of TAB_PATHS) {
    if (pathname === p || pathname.startsWith(`${p}/`)) return p;
  }
  return null;
}

export function KeepAliveTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthorized = useAuthStore((s) => s.isAuthorized);
  const activeTab = matchTab(pathname, isAuthorized);
  const [mounted, setMounted] = useState<Record<TabPath, boolean>>({
    '/dialogs': true,
    '/contacts': activeTab === '/contacts',
    '/ai': activeTab === '/ai',
    '/calendar': activeTab === '/calendar',
    '/settings': activeTab === '/settings',
  });

  useEffect(() => {
    if (activeTab && !mounted[activeTab]) {
      setMounted((prev) => ({ ...prev, [activeTab]: true }));
    }
  }, [activeTab, mounted]);

  return (
    <>
      {mounted['/dialogs'] && (
        <div className={activeTab === '/dialogs' ? 'flex-1 min-h-0 flex flex-col h-full' : 'hidden'}>
          <ChatListScreen />
        </div>
      )}
      {mounted['/contacts'] && (
        <div className={activeTab === '/contacts' ? 'flex-1 min-h-0 flex flex-col h-full' : 'hidden'}>
          <ContactsScreen />
        </div>
      )}
      {mounted['/ai'] && (
        <div className={activeTab === '/ai' ? 'flex-1 min-h-0 flex flex-col h-full' : 'hidden'}>
          <AiScreen />
        </div>
      )}
      {mounted['/calendar'] && (
        <div className={activeTab === '/calendar' ? 'flex-1 min-h-0 flex flex-col h-full' : 'hidden'}>
          <CalendarScreen />
        </div>
      )}
      {mounted['/settings'] && (
        <div className={activeTab === '/settings' ? 'flex-1 min-h-0 flex flex-col h-full' : 'hidden'}>
          <SettingsScreen />
        </div>
      )}
      {!activeTab && children}
    </>
  );
}
