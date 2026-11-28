import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

export default function HomePage() {
  const isAuthorized = useAuthStore((s) => s.isAuthorized);

  if (isAuthorized) {
    return <Navigate to="/dialogs" replace />;
  }

  return <Navigate to="/auth" replace />;
}
