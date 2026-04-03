import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ClassWithStats } from '@/types/teacher';

export function useTeacherClasses() {
  return useQuery({
    queryKey: ['teacher-classes'],
    queryFn: async (): Promise<ClassWithStats[]> => {
      const { data, error } = await supabase.functions.invoke('teacher-classes');
      
      if (error) throw error;
      return data.classes || [];
    },
  });
}
