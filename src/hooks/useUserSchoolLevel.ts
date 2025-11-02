import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getUserAgeFromLevel, getUserAgeRangeFromLevel } from '@/utils/schoolLevelFilter';

export interface UserSchoolLevel {
  level: string | null;
  age: number | null;
  ageRange: [number, number] | null;
}

export function useUserSchoolLevel() {
  return useQuery({
    queryKey: ['user-school-level'],
    queryFn: async (): Promise<UserSchoolLevel> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { level: null, age: null, ageRange: null };
      }
      
      // Try users table first
      const { data: userProfile } = await supabase
        .from('users')
        .select('level')
        .eq('id', user.id)
        .single();
      
      let level = userProfile?.level || null;
      
      // Check children table (takes precedence)
      const { data: childProfile } = await supabase
        .from('children')
        .select('grade')
        .eq('user_id', user.id)
        .single();
      
      if (childProfile?.grade) {
        level = childProfile.grade;
      }
      
      const age = getUserAgeFromLevel(level);
      const ageRange = getUserAgeRangeFromLevel(level);
      
      return { level, age, ageRange };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}



