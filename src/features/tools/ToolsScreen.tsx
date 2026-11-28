'use client';
import YouTubeScreen from '@/features/youtube/YouTubeScreen';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function ToolsScreen() {
  return (
    <ErrorBoundary fallbackTitle="Tools temporarily unavailable">
      <YouTubeScreen />
    </ErrorBoundary>
  );
}
