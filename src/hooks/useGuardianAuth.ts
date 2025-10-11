import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useGuardianAuth = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: guardianData, isLoading } = useQuery({
    queryKey: ['guardian-auth', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Check if user has guardian profile
      const { data, error } = await supabase
        .from('guardians')
        .select('id, user_id, billing_customer_id')
        .eq('user_id', user.id)
        .single();
      
      if (error || !data) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const isGuardian = !!guardianData;
  const isAuthenticated = !!user;
  const loading = authLoading || (!!user && isLoading);

  return {
    isGuardian,
    isAuthenticated,
    canAccessGuardianPortal: isAuthenticated && isGuardian,
    guardianId: guardianData?.id,
    billingCustomerId: guardianData?.billing_customer_id,
    loading,
  };
};
