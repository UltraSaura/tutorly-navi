import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Topic, Video } from '@/types/learning';
import { useUserSchoolLevel } from './useUserSchoolLevel';
import { filterContentByUserLevel } from '@/utils/schoolLevelFilter';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { useAdminAuth } from './useAdminAuth';

// Select best variant from a group based on user's language preference
const selectBestVariants = (videos: any[], userLanguage: string): any[] => {
  // Separate videos into groups and standalone
  const groupedVideos = new Map<string, any[]>();
  const standaloneVideos: any[] = [];

  for (const video of videos) {
    if (video.variant_group_id) {
      const group = groupedVideos.get(video.variant_group_id) || [];
      group.push(video);
      groupedVideos.set(video.variant_group_id, group);
    } else {
      standaloneVideos.push(video);
    }
  }

  // Select best variant from each group
  const selectedFromGroups: any[] = [];
  for (const [, variants] of groupedVideos) {
    // Priority: user's language → English → first available
    const bestMatch = 
      variants.find(v => v.language === userLanguage) ||
      variants.find(v => v.language === 'en') ||
      variants[0];
    
    if (bestMatch) {
      selectedFromGroups.push(bestMatch);
    }
  }

  return [...standaloneVideos, ...selectedFromGroups];
};

interface CoursePlaylistData {
  topic: Topic | null;
  videos: Video[];
  featuredVideo: Video | null;
}

export function useCoursePlaylist(topicSlug: string) {
  const { data: userLevelData } = useUserSchoolLevel();
  const { language: userLanguage } = useLanguage();
  const { isAdmin } = useAdminAuth();
  
  return useQuery({
    queryKey: ['course-playlist', topicSlug, userLevelData?.level, userLanguage, isAdmin],
    queryFn: async (): Promise<CoursePlaylistData> => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get topic
      const { data: topic, error: topicError } = await (supabase as any)
        .from('learning_topics')
        .select('*')
        .eq('slug', topicSlug)
        .eq('is_active', true)
        .single();

      if (topicError) throw topicError;

      // Get videos
      const { data: allVideos, error: allVideosError } = await (supabase as any)
        .from('learning_videos')
        .select('*')
        .eq('topic_id', topic.id)
        .eq('is_active', true)
        .order('order_index');

      if (allVideosError) throw allVideosError;
      
      // Admin sees all videos; students get filtered by age/level and language
      let suitableVideos = isAdmin 
        ? (allVideos as any[])
        : filterContentByUserLevel(
            allVideos as any,
            userLevelData?.level || null,
            userLevelData?.age || null,
            userLanguage
          );
      
      // Group videos by variant_group_id and select best match per group
      suitableVideos = selectBestVariants(suitableVideos, userLanguage);
      
      // Get quizzes for suitable videos
      const videoIds = suitableVideos.map((v: any) => v.id);
      const { data: allQuizzes } = videoIds.length > 0 ? await supabase
        .from('video_quizzes')
        .select('*')
        .in('video_id', videoIds)
        .order('order_index') : { data: [] };
      
      // Admin sees all quizzes; students get filtered by age/level and language
      const suitableQuizzes = isAdmin
        ? (allQuizzes as any[])
        : filterContentByUserLevel(
            allQuizzes as any,
            userLevelData?.level || null,
            userLevelData?.age || null,
            userLanguage
          );

      // Get user progress for videos
      let videosWithProgress = suitableVideos as any[];
      let featuredVideo = (suitableVideos as any[])[0] || null;

      if (user && suitableVideos && suitableVideos.length > 0) {
        const { data: progress } = await (supabase as any)
          .from('user_learning_progress')
          .select('*')
          .eq('user_id', user.id)
          .in('video_id', (suitableVideos as any[]).map((v: any) => v.id));

        videosWithProgress = (suitableVideos as any[]).map((video: any) => {
          const videoProgress = (progress as any[])?.find((p: any) => p.video_id === video.id);
          return {
            ...video,
            progress_percentage: videoProgress?.progress_percentage || 0,
            last_watched_position_seconds: videoProgress?.last_watched_position_seconds || 0,
            progress_type: videoProgress?.progress_type,
            is_completed: videoProgress?.progress_type === 'video_completed',
          };
        });

        // Find featured video (last watched or first unwatched)
        const lastWatched = videosWithProgress
          .filter((v: any) => v.progress_percentage && v.progress_percentage > 0)
          .sort((a: any, b: any) => (b.progress_percentage || 0) - (a.progress_percentage || 0))[0];

        const firstUnwatched = videosWithProgress.find((v: any) => !v.progress_percentage || v.progress_percentage === 0);

        featuredVideo = lastWatched || firstUnwatched || (suitableVideos as any[])[0];
      }

      return {
        topic: topic as Topic,
        videos: videosWithProgress as Video[],
        featuredVideo: featuredVideo as Video,
      };
    },
    enabled: !!topicSlug,
    staleTime: 5 * 60 * 1000,
  });
}
