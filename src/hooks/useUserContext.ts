import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserContextData {
  student_level?: string;
  country?: string;
  learning_style?: string;
  first_name?: string;
  user_type?: string;
}

export const useUserContext = () => {
  const { user } = useAuth();

  const { data: userContext } = useQuery({
    queryKey: ['user-context', user?.id],
    queryFn: async (): Promise<UserContextData | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name, country, level, style, user_type')
        .eq('id', user.id)
        .single();

      if (error || !data) return null;

      return {
        student_level: data.level || undefined,
        country: data.country || undefined,
        learning_style: data.style || undefined,
        first_name: data.first_name || undefined,
        user_type: data.user_type || undefined,
      };
    },
    enabled: !!user?.id,
  });

  return { userContext };
};