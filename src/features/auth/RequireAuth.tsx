import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PageSpinner } from '@/components/ui';
import { useAuth } from './AuthProvider';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageSpinner />;
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading, session, profile } = useAuth();
  // Profile loads right after sign-in; wait for it instead of bouncing an admin away.
  if (loading || (session && !profile)) return <PageSpinner />;
  if (!isAdmin) return <Navigate to="/learn" replace />;
  return <>{children}</>;
}
