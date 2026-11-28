import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Providers } from './app/providers';
import { KeepAliveTabs } from './components/layout/KeepAliveTabs';
import { BottomNav } from './components/layout/BottomNav';

import HomePage from './app/page';
import ChatListScreen from './features/chat-list/ChatListScreen';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const AuthScreen = lazy(() => import('./features/authentication/AuthScreen'));
const ToolsScreen = lazy(() => import('./features/tools/ToolsScreen'));
const AiScreen = lazy(() => import('./features/ai/AiScreen'));
const CalendarScreen = lazy(() => import('./features/calendar/CalendarScreen'));
const SettingsScreen = lazy(() => import('./features/settings/SettingsScreen'));
const ConversationScreen = lazy(() => import('./features/conversations/ConversationScreen'));
const ProfileScreen = lazy(() => import('./features/profile/ProfileScreen'));
const QrScannerScreen = lazy(() => import('./features/qr-scanner/QrScannerScreen'));
const SearchScreen = lazy(() => import('./features/search/SearchScreen'));
const ErpScreen = lazy(() => import('./features/erp/ErpScreen'));
const YouTubeScreen = lazy(() => import('./features/youtube/YouTubeScreen'));
import { GlobalYouTubePlayer } from './components/youtube/GlobalYouTubePlayer';

function RouteLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center bg-tg-bg select-none">
      <div className="relative w-[92px] h-[92px] flex items-center justify-center">
        {/* Spinning ring directly around the rounded-full Telegram logo */}
        <div className="absolute inset-0 rounded-full border-[3px] border-white/10 border-t-[#2AABEE] border-r-[#2AABEE]/40 animate-spin" />
        {/* Rounded-full Telegram circle without any shadow */}
        <div className="w-[76px] h-[76px] rounded-full bg-[#2AABEE] flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mr-0.5 mb-0.5">
            <path
              d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ChatRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <ErrorBoundary fallbackTitle="Chat temporarily unavailable">
      <Suspense fallback={<RouteLoadingFallback />}>
        <ConversationScreen key={id} />
      </Suspense>
    </ErrorBoundary>
  );
}

function ProfileRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <ProfileScreen key={id} />
    </Suspense>
  );
}

export default function App() {
  return (
    <Providers>
      <div
        id="app"
        className="flex flex-col w-full h-[100lvh] min-h-0 overflow-hidden bg-tg-bg"
        style={{
          height: 'var(--app-height, 100lvh)',
          transform: 'translateY(var(--app-top, 0px))',
        }}
      >
        {/* Main application content */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <KeepAliveTabs>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthScreen />} />
                <Route path="/dialogs" element={<ChatListScreen />} />
                <Route path="/tools" element={<ToolsScreen />} />
                <Route path="/contacts" element={<Navigate to="/tools" replace />} />
                <Route path="/ai" element={<AiScreen />} />
                <Route path="/calendar" element={<CalendarScreen />} />
                <Route path="/calls" element={<Navigate to="/calendar" replace />} />
                <Route path="/settings" element={<SettingsScreen />} />
                <Route path="/chat/:id" element={<ChatRoute />} />
                <Route path="/profile/:id" element={<ProfileRoute />} />
                <Route path="/qr-scan" element={<QrScannerScreen />} />
                <Route path="/search" element={<SearchScreen />} />
                <Route path="/erp" element={<ErpScreen />} />
                <Route path="/bank" element={<Navigate to="/erp" replace />} />
                <Route path="/youtube" element={<YouTubeScreen />} />
                <Route path="*" element={<Navigate to="/dialogs" replace />} />
              </Routes>
            </Suspense>
          </KeepAliveTabs>
        </main>

        {/* Global floating Picture-in-Picture & background YouTube player */}
        <GlobalYouTubePlayer />

        {/* Global bottom navigation */}
        <BottomNav />
      </div>
    </Providers>
  );
}
