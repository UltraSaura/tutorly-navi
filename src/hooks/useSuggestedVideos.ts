import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractKeywordsFromHomework, scoreVideoMatch } from '@/utils/homeworkKeywordExtractor';
import { filterContentByUserLevel } from '@/utils/schoolLevelFilter';
import { useUserSchoolLevel } from './useUserSchoolLevel';
import { useLanguage } from '@/context/SimpleLanguageContext';
import type { Video } from '@/types/learning';

interface SuggestedVideo extends Video {
  matchScore: number;
}

export function useSuggestedVideos(homeworkContent: string | null, limit: number = 3) {
  const { data: userLevelData } = useUserSchoolLevel();
  const { language: userLanguage } = useLanguage();
  
  return useQuery({
    queryKey: ['suggested-videos', homeworkContent, userLevelData?.level, userLanguage],
    queryFn: async (): Promise<SuggestedVideo[]> => {
      if (!homeworkContent || homeworkContent.trim() === '') {
        return [];
      }
      
      // Extract keywords from homework
      const keywords = extractKeywordsFromHomework(homeworkContent);
      
      if (keywords.allKeywords.length === 0) {
        return [];
      }
      
      // Get all active videos
      const { data: allVideos, error } = await supabase
        .from('learning_videos')
        .select('*')
        .eq('is_active', true);
      
      if (error || !allVideos) {
        console.error('Error fetching videos for suggestions:', error);
        return [];
      }
      
      // Filter by user's age/level and language
      const suitableVideos = filterContentByUserLevel(
        allVideos as any,
        userLevelData?.level || null,
        userLevelData?.age || null,
        userLanguage
      ) as Video[];
      
      // Score and rank videos
      const scoredVideos: SuggestedVideo[] = suitableVideos
        .filter(video => video.tags && video.tags.length > 0)
        .map(video => ({
          ...video,
          matchScore: scoreVideoMatch(video.tags || [], keywords.allKeywords),
        }))
        .filter(video => video.matchScore > 0) // Only videos with some match
        .sort((a, b) => b.matchScore - a.matchScore) // Sort by match score
        .slice(0, limit); // Limit results
      
      return scoredVideos;
    },
    enabled: !!homeworkContent && homeworkContent.trim() !== '',
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
}
