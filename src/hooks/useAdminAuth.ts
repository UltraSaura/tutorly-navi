import { useAuth } from '@/context/AuthContext';
import { useUserContext } from '@/hooks/useUserContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAdminAuth = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: userRoles, isLoading } = useQuery({
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

  const isAdmin = userRoles?.includes('admin') ?? false;
  const isAuthenticated = !!user;
  // Only consider loading if auth is loading OR if user exists and we're fetching their context
  const isLoading_ = authLoading || (!!user && isLoading);

  return {
    isAdmin,
    isAuthenticated,
    canAccessAdmin: isAuthenticated && isAdmin,
    isLoading: isLoading_,
    userRoles: userRoles || [],
  };
};