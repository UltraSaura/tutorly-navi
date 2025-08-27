import { useAuth } from '@/context/AuthContext';
import { useUserContext } from '@/hooks/useUserContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAdminAuth = () => {
  const { user } = useAuth();

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
  const isLoading_ = isLoading || !user;

  return {
    isAdmin,
    isAuthenticated,
    canAccessAdmin: isAuthenticated && isAdmin,
    isLoading: isLoading_,
  };
};