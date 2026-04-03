import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTeacherAuth = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: teacherData, isLoading } = useQuery({
    queryKey: ['teacher-auth', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('teachers')
        .select('id, user_id, department')
        .eq('user_id', user.id)
        .single();
      
      if (error || !data) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  return {
    isTeacher: !!teacherData,
    isAuthenticated: !!user,
    canAccessTeacherPortal: !!user && !!teacherData,
    teacherId: teacherData?.id,
    loading: authLoading || (!!user && isLoading),
  };
};
