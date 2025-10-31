import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useGuardianExplanations = (guardianId?: string) => {
  return useQuery({
    queryKey: ['guardian-explanations', guardianId],
    queryFn: async () => {
      if (!guardianId) return [];

      // Get guardian's user_id
      const { data: guardianData, error: guardianError } = await supabase
        .from('guardians')
        .select('user_id')
        .eq('id', guardianId)
        .single();

      if (guardianError) throw guardianError;
      if (!guardianData) return [];

      // Fetch guardian's own exercise history
      const { data: guardianExercises, error: guardianExercisesError } = await supabase
        .from('exercise_history')
        .select('*')
        .eq('user_id', guardianData.user_id);

      if (guardianExercisesError) throw guardianExercisesError;

      // Fetch all explanations from cache
      const { data: allExplanations, error: explanationsError } = await supabase
        .from('exercise_explanations_cache')
        .select('*')
        .order('created_at', { ascending: false });

      if (explanationsError) throw explanationsError;

      // Match guardian's exercises with explanations by exercise_hash
      const guardianExplanationsMap = new Map();
      (guardianExercises || []).forEach((exercise: any) => {
        const matchingExplanation = (allExplanations || []).find(
          (exp: any) => exp.exercise_content === exercise.exercise_content
        );
        if (matchingExplanation) {
          guardianExplanationsMap.set(matchingExplanation.id, {
            ...matchingExplanation,
            isGuardianOwn: true,
            childName: 'My Practice',
            exerciseContent: exercise.exercise_content,
            userAnswer: exercise.user_answer,
            subjectId: exercise.subject_id,
            exerciseDate: exercise.created_at
          });
        }
      });

      // Fetch children's explanations
      const { data: childLinks, error: linksError } = await supabase
        .from('guardian_child_links')
        .select('child_id')
        .eq('guardian_id', guardianId);

      if (linksError) throw linksError;

      const childIds = childLinks?.map(link => link.child_id) || [];

      // Fetch children's exercise history
      const childExplanations: any[] = [];
      if (childIds.length > 0) {
        const { data: childrenData, error: childrenError } = await supabase
          .from('children')
          .select('id, user_id, users!inner(first_name, last_name)')
          .in('id', childIds);

        if (childrenError) throw childrenError;

        for (const child of childrenData || []) {
          const { data: childExercises, error: childExercisesError } = await supabase
            .from('exercise_history')
            .select('*')
            .eq('user_id', child.user_id);

          if (childExercisesError) continue;

          (childExercises || []).forEach((exercise: any) => {
            const matchingExplanation = (allExplanations || []).find(
              (exp: any) => exp.exercise_content === exercise.exercise_content
            );
            if (matchingExplanation && !guardianExplanationsMap.has(matchingExplanation.id)) {
              childExplanations.push({
                ...matchingExplanation,
                isGuardianOwn: false,
                childName: `${(child.users as any).first_name} ${(child.users as any).last_name}`,
                exerciseContent: exercise.exercise_content,
                userAnswer: exercise.user_answer,
                subjectId: exercise.subject_id,
                exerciseDate: exercise.created_at
              });
            }
          });
        }
      }

      // Combine and sort by date
      const allResults = [...Array.from(guardianExplanationsMap.values()), ...childExplanations];
      return allResults.sort((a, b) => 
        new Date(b.exerciseDate).getTime() - new Date(a.exerciseDate).getTime()
      );
    },
    enabled: !!guardianId,
  });
};
