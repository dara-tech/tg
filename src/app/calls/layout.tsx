import { BottomNav } from '@/components/layout/BottomNav';

export default function CallsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      <BottomNav />
    </div>
  );
}
