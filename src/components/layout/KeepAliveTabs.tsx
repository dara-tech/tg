'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ChatListScreen from '@/features/chat-list/ChatListScreen';
import ContactsScreen from '@/features/contacts/ContactsScreen';
import CallsScreen from '@/features/calls/CallsScreen';
import SettingsScreen from '@/features/settings/SettingsScreen';

const TAB_PATHS = ['/dialogs', '/contacts', '/calls', '/settings'] as const;
type TabPath = (typeof TAB_PATHS)[number];

function matchTab(pathname: string): TabPath | null {
  for (const p of TAB_PATHS) {
    if (pathname === p || pathname.startsWith(`${p}/`)) return p;
  }
  return null;
}

export function KeepAliveTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTab = matchTab(pathname);
  const [mounted, setMounted] = useState<Record<TabPath, boolean>>({
    '/dialogs': activeTab === '/dialogs',
    '/contacts': activeTab === '/contacts',
    '/calls': activeTab === '/calls',
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
      {mounted['/calls'] && (
        <div className={activeTab === '/calls' ? 'flex-1 min-h-0 flex flex-col h-full' : 'hidden'}>
          <CallsScreen />
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
