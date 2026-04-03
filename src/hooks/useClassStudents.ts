import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useClassStudents(classId: string | undefined) {
  return useQuery({
    queryKey: ['class-students', classId],
    queryFn: async () => {
      if (!classId) return [];
      
      const params = new URLSearchParams({ classId });
      const { data, error } = await supabase.functions.invoke(
        `class-students?${params.toString()}`
      );
      
      if (error) throw error;
      return data.students || [];
    },
    enabled: !!classId,
  });
}
