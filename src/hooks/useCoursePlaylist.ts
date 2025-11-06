import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Topic, Video } from '@/types/learning';
import { useUserSchoolLevel } from './useUserSchoolLevel';
import { filterContentByUserLevel } from '@/utils/schoolLevelFilter';

interface CoursePlaylistData {
  topic: Topic | null;
  videos: Video[];
  featuredVideo: Video | null;
}

export function useCoursePlaylist(topicSlug: string) {
  const { data: userLevelData } = useUserSchoolLevel();
  
  return useQuery({
    queryKey: ['course-playlist', topicSlug, userLevelData?.level],
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
      
      // Filter videos by user's age/level
      const suitableVideos = filterContentByUserLevel(
        allVideos as any,
        userLevelData?.level || null,
        userLevelData?.age || null
      );
      
      // Get quizzes for suitable videos
      const videoIds = suitableVideos.map((v: any) => v.id);
      const { data: allQuizzes } = videoIds.length > 0 ? await supabase
        .from('video_quizzes')
        .select('*')
        .in('video_id', videoIds)
        .order('order_index') : { data: [] };
      
      // Filter quizzes by user's age/level
      const suitableQuizzes = filterContentByUserLevel(
        allQuizzes as any,
        userLevelData?.level || null,
        userLevelData?.age || null
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
