import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StudentCurriculumProgress } from '@/types/progress';

export function useStudentProgress(studentId: string | undefined, subjectId?: string) {
  return useQuery({
    queryKey: ['student-progress', studentId, subjectId],
    queryFn: async (): Promise<StudentCurriculumProgress | null> => {
      if (!studentId) return null;
      
      const params = new URLSearchParams({ studentId });
      if (subjectId) params.append('subjectId', subjectId);
      
      const { data, error } = await supabase.functions.invoke(
        `student-progress?${params.toString()}`
      );
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
}
