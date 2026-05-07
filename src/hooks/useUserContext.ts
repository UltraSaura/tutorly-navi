import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeLearningStyle, type LearningStyle } from '@/types/learning-style';

export interface UserContextData {
  student_level?: string;
  country?: string;
  learning_style?: LearningStyle;
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

      // Check children table for grade (takes precedence)
      const { data: childData } = await supabase
        .from('children')
        .select('grade')
        .eq('user_id', user.id)
        .single();

      return {
        student_level: childData?.grade || data.level || undefined,
        country: data.country || undefined,
        learning_style: normalizeLearningStyle(data.style),
        first_name: data.first_name || undefined,
        user_type: data.user_type || undefined,
      };
    },
    enabled: !!user?.id,
  });

  return { userContext };
};
