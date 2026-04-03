import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { RecommendedTopic, RecommendationOptions } from '@/types/recommendations';

interface RecommendationsResponse {
  recommendations: RecommendedTopic[];
  student_id: string;
  country_code: string;
  level_code: string;
}

/**
 * Fetch personalized recommendations from the edge function
 * Uses student's curriculum (country + level) to filter topics
 * Calculates priority_score = 1 - masteryRatio for each topic
 */
export function useRecommendations(options: RecommendationOptions = {}) {
  const { user } = useAuth();
  const { subjectId, excludeTopicId, preferSameSubdomain, limit = 10 } = options;

  return useQuery({
    queryKey: ['recommendations', user?.id, subjectId, excludeTopicId, preferSameSubdomain, limit],
    queryFn: async (): Promise<RecommendedTopic[]> => {
      if (!user?.id) return [];

      // Build query params
      const params = new URLSearchParams();
      if (subjectId) params.append('subjectId', subjectId);
      if (excludeTopicId) params.append('excludeTopicId', excludeTopicId);
      if (preferSameSubdomain) params.append('preferSameSubdomain', preferSameSubdomain);
      params.append('limit', limit.toString());

      const { data, error } = await supabase.functions.invoke('recommendations', {
        method: 'GET',
      });

      if (error) {
        console.error('[useRecommendations] Error:', error);
        throw error;
      }

      const response = data as RecommendationsResponse;
      return response.recommendations || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get recommendations for topic page "What to do next"
 * Prefers topics in the same subdomain as the current topic
 */
export function useTopicNextSteps(currentTopicId: string | undefined, currentSubdomainId: string | undefined) {
  return useRecommendations({
    excludeTopicId: currentTopicId,
    preferSameSubdomain: currentSubdomainId,
    limit: 3,
  });
}
