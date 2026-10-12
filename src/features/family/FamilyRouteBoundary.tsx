import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useFamilyProfile } from '@/context/FamilyProfileContext';
import { useAuth } from '@/context/AuthContext';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { Loader2 } from 'lucide-react';

export function FamilyRouteBoundary({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const family = useFamilyProfile();
  const ui = useInterfaceTranslation();
  const { loading, busy, switchProfile } = family;
  const { pathname } = useLocation();
  const publicRoute = pathname === '/auth' || pathname === '/logout';
  const parentRoute = pathname === '/guardian' || pathname.startsWith('/guardian/');
  const chooser = pathname === '/family';
  const forbidden = family.isFamily && Boolean(family.activeProfile) &&
    (chooser || (family.activeProfile?.kind === 'parent' && !parentRoute) ||
      (family.activeProfile?.kind === 'child' && (parentRoute || pathname.startsWith('/admin') || pathname.startsWith('/teacher') || pathname === '/management')));
  useEffect(() => {
    if (forbidden && !loading && !busy) void switchProfile().catch(() => {});
  }, [forbidden, loading, busy, switchProfile]);
  if (forbidden && busy) return <div className="min-h-screen grid place-items-center p-6" role="status">{ui('family.busy')}</div>;
  if (family.loading && user) return <div className="min-h-screen grid place-items-center" role="status"><Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" /></div>;
  if (!user && (chooser || parentRoute)) return <Navigate to="/auth" replace />;
  if (family.isFamily && !publicRoute) {
    if (forbidden || (!family.activeProfile && !chooser)) return <Navigate to="/family" replace />;
    if (family.error && !chooser) return <Navigate to="/family" replace />;
  }
  if (!family.isFamily && chooser) return <Navigate to="/" replace />;
  return <div key={family.epoch} className="contents">{children}</div>;
}
