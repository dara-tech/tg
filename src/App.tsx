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

function RouteLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center bg-tg-bg text-tg-text-hint">
      <div className="w-8 h-8 rounded-full border-2 border-tg-primary/30 border-t-tg-primary animate-spin" />
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
                <Route path="*" element={<Navigate to="/dialogs" replace />} />
              </Routes>
            </Suspense>
          </KeepAliveTabs>
        </main>

        {/* Global bottom navigation */}
        <BottomNav />
      </div>
    </Providers>
  );
}
