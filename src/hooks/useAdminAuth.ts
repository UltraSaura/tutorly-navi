import { useFamilyProfile } from '@/context/FamilyProfileContext';
import { useAuth } from '@/context/AuthContext';
import { useUserContext } from '@/hooks/useUserContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isAdministratorRole, permissionsForRoles, type AdminPermission } from '@/lib/admin/permissions';

export const useAdminAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const family = useFamilyProfile();

  const { data: userRoles, isLoading, refetch: refetchRoles } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error || !data) return null;
      return data.map(r => r.role);
    },
    enabled: !!user?.id,
  });

  const roles = userRoles || [];
  const permissions = permissionsForRoles(roles);
  const isAdmin = !family.isFamily && roles.some(isAdministratorRole);
  // A tester can preview curriculum levels but never inherits admin access.
  const isTester = !family.isFamily && (userRoles?.includes('tester') ?? false);
  const canPreviewSchoolLevels = isAdmin || isTester;
  const isAuthenticated = !!user;
  // Only consider loading if auth is loading OR if user exists and we're fetching their context
  const isLoading_ = authLoading || (!!user && isLoading);

  return {
    isAdmin,
    isTester,
    canPreviewSchoolLevels,
    isAuthenticated,
    canAccessAdmin: isAuthenticated && isAdmin,
    isLoading: isLoading_,
    userRoles: roles,
    permissions,
    hasPermission: (permission: AdminPermission) => permissions.has(permission),
    refreshPermissions: refetchRoles,
  };
};
