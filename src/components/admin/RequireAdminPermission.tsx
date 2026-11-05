import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { AdminPermission } from '@/lib/admin/permissions';

export function AccessDenied() {
  const ui = useInterfaceTranslation();
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-semibold">{ui('Access denied')}</h1>
        <p className="text-muted-foreground">{ui('You do not have permission to access this administration section.')}</p>
      </div>
    </div>
  );
}

export default function RequireAdminPermission({ permission, children }: { permission: AdminPermission; children: ReactNode }) {
  const ui = useInterfaceTranslation();
  const location = useLocation();
  const { isAuthenticated, canAccessAdmin, isLoading, hasPermission } = useAdminAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">{ui('Loading...')}</div>;
  if (!isAuthenticated || !canAccessAdmin) {
    return <Navigate to="/auth" replace state={{ message: ui('Please log in as an administrator'), returnTo: location.pathname }} />;
  }
  if (!hasPermission(permission)) return <AccessDenied />;
  return <>{children}</>;
}
