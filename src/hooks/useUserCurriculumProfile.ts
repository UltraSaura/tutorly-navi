import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { getCountry, getLevel } from '@/lib/curriculum';
import type { CurriculumProfile } from '@/types/profile';

export function useUserCurriculumProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userCurriculumProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('curriculum_country_code, curriculum_level_code')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (!data.curriculum_country_code || !data.curriculum_level_code) {
        return null;
      }
      
      const country = getCountry(data.curriculum_country_code);
      const level = getLevel(data.curriculum_country_code, data.curriculum_level_code);
      
      return {
        countryCode: data.curriculum_country_code,
        levelCode: data.curriculum_level_code,
        countryName: country?.name,
        levelLabel: level?.label,
      } as CurriculumProfile;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async ({ countryCode, levelCode }: { countryCode: string; levelCode: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('users')
        .update({
          curriculum_country_code: countryCode,
          curriculum_level_code: levelCode,
        })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCurriculumProfile'] });
    },
  });

  return {
    profile,
    isLoading,
    hasProfile: !!profile,
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isPending,
  };
}
