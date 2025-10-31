import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ChildSettings {
  show_correct_answer?: boolean;
  allow_content_upload?: boolean;
  messaging_limit?: number;
}

export const useChildAuth = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: childData, isLoading } = useQuery({
    queryKey: ['child-auth', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Check if user has child profile
      const { data, error } = await supabase
        .from('children')
        .select('id, user_id, settings_json, grade, status')
        .eq('user_id', user.id)
        .single();
      
      if (error || !data) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const isChild = !!childData;
  const isAuthenticated = !!user;
  const loading = authLoading || (!!user && isLoading);
  const settings = (childData?.settings_json || {}) as ChildSettings;

  return {
    isChild,
    isAuthenticated,
    canAccessKidPortal: isAuthenticated && isChild,
    childId: childData?.id,
    grade: childData?.grade,
    status: childData?.status,
    settings,
    loading,
  };
};
