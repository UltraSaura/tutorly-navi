import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLearner } from '@/context/FamilyProfileContext';

export interface StudentProductTourProfile {
  userType: string | null;
  curriculumCountryCode: string | null;
  curriculumLevelCode: string | null;
  completedAt: string | null;
}

export function isEligibleStudentTourProfile(
  profile: StudentProductTourProfile | null | undefined,
): boolean {
  return profile?.userType === 'student'
    && Boolean(profile.curriculumCountryCode)
    && Boolean(profile.curriculumLevelCode)
    && !profile.completedAt;
}

export function useStudentProductTour() {
  const { user } = useLearner();
  const queryClient = useQueryClient();

  const profileQuery = useQuery<StudentProductTourProfile | null>({
    queryKey: ['studentProductTourProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('user_type, curriculum_country_code, curriculum_level_code, product_tour_completed_at')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return {
        userType: data.user_type,
        curriculumCountryCode: data.curriculum_country_code,
        curriculumLevelCode: data.curriculum_level_code,
        completedAt: data.product_tour_completed_at,
      };
    },
    enabled: Boolean(user?.id),
  });

  const completionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('users')
        .update({ product_tour_completed_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentProductTourProfile', user?.id] });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading || profileQuery.isFetching,
    isError: profileQuery.isError,
    isEligible: isEligibleStudentTourProfile(profileQuery.data),
    isCompleted: Boolean(profileQuery.data?.completedAt),
    completeTour: completionMutation.mutateAsync,
    isCompleting: completionMutation.isPending,
  };
}
