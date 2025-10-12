import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useGuardianExplanations = (guardianId?: string) => {
  return useQuery({
    queryKey: ['guardian-explanations', guardianId],
    queryFn: async () => {
      if (!guardianId) return [];

      const { data, error } = await supabase
        .from('exercise_explanations_cache')
        .select(`
          *,
          exercise_history!inner(
            id,
            user_id,
            exercise_content,
            user_answer,
            is_correct,
            created_at,
            subject_id,
            children!inner(
              id,
              user_id,
              users!inner(first_name, last_name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter to only show explanations for children linked to this guardian
      const { data: childLinks, error: linksError } = await supabase
        .from('guardian_child_links')
        .select('child_id')
        .eq('guardian_id', guardianId);

      if (linksError) throw linksError;

      const childIds = childLinks?.map(link => link.child_id) || [];
      
      return (data || []).filter((explanation: any) => {
        const childData = explanation.exercise_history?.[0]?.children;
        return childData && childIds.includes(childData.id);
      }).map((explanation: any) => ({
        ...explanation,
        childName: `${explanation.exercise_history[0].children.users.first_name} ${explanation.exercise_history[0].children.users.last_name}`,
        exerciseContent: explanation.exercise_history[0].exercise_content,
        userAnswer: explanation.exercise_history[0].user_answer,
        subjectId: explanation.exercise_history[0].subject_id,
        exerciseDate: explanation.exercise_history[0].created_at
      }));
    },
    enabled: !!guardianId,
  });
};
