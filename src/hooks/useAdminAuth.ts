import { useAuth } from '@/context/AuthContext';
import { useUserContext } from '@/hooks/useUserContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAdminAuth = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: userContext, isLoading } = useQuery({
    queryKey: ['user-context', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (error || !data) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const isAdmin = userContext?.user_type === 'admin';
  const isAuthenticated = !!user;
  // Only consider loading if auth is loading OR if user exists and we're fetching their context
  const isLoading_ = authLoading || (!!user && isLoading);

  return {
    isAdmin,
    isAuthenticated,
    canAccessAdmin: isAuthenticated && isAdmin,
    isLoading: isLoading_,
  };
};