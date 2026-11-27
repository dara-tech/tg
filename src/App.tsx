import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Providers } from './app/providers';
import { KeepAliveTabs } from './components/layout/KeepAliveTabs';
import { BottomNav } from './components/layout/BottomNav';

import HomePage from './app/page';
import AuthScreen from './features/authentication/AuthScreen';
import ChatListScreen from './features/chat-list/ChatListScreen';
import ContactsScreen from './features/contacts/ContactsScreen';
import CallsScreen from './features/calls/CallsScreen';
import SettingsScreen from './features/settings/SettingsScreen';
import ConversationScreen from './features/conversations/ConversationScreen';
import ProfileScreen from './features/profile/ProfileScreen';
import QrScannerScreen from './features/qr-scanner/QrScannerScreen';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import SearchScreen from './features/search/SearchScreen';

function ChatRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <ErrorBoundary fallbackTitle="Chat temporarily unavailable">
      <ConversationScreen key={id} />
    </ErrorBoundary>
  );
}

function ProfileRoute() {
  const { id } = useParams<{ id: string }>();
  return <ProfileScreen key={id} />;
}

export default function App() {
  return (
    <Providers>
      <div
        id="app"
        className="flex flex-col w-full h-[100lvh] min-h-0 overflow-hidden"
        style={{
          height: 'var(--app-height, 100lvh)',
          transform: 'translateY(var(--app-top, 0px))',
        }}
      >
        {/* Main application content */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <KeepAliveTabs>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthScreen />} />
              <Route path="/dialogs" element={<ChatListScreen />} />
              <Route path="/contacts" element={<ContactsScreen />} />
              <Route path="/calls" element={<CallsScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/chat/:id" element={<ChatRoute />} />
              <Route path="/profile/:id" element={<ProfileRoute />} />
              <Route path="/qr-scan" element={<QrScannerScreen />} />
              <Route path="/search" element={<SearchScreen />} />
              <Route path="*" element={<Navigate to="/dialogs" replace />} />
            </Routes>
          </KeepAliveTabs>
        </main>

        {/* Global bottom navigation */}
        <BottomNav />
      </div>
    </Providers>
  );
}
