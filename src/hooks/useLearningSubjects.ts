import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Subject, SubjectProgress } from '@/types/learning';
import { useUserSchoolLevel } from './useUserSchoolLevel';
import { filterContentByUserLevel } from '@/utils/schoolLevelFilter';

export function useLearningSubjects() {
  const { data: userLevelData } = useUserSchoolLevel();
  
  return useQuery({
    queryKey: ['learning-subjects', userLevelData?.level],
    queryFn: async (): Promise<SubjectProgress[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get all active subjects
      const { data: subjects, error: subjectsError } = await supabase
        .from('learning_subjects')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      
      if (subjectsError) throw subjectsError;
      if (!subjects) return [];
      
      // For each subject, count videos and filter by user level
      const subjectsWithProgress = await Promise.all(
        subjects.map(async (subject) => {
          // Get categories for this subject
          const { data: categories } = await supabase
            .from('learning_categories')
            .select('id')
            .eq('subject_id', subject.id)
            .eq('is_active', true);
          
          if (!categories || categories.length === 0) {
            return {
              subject: subject as Subject,
              videos_ready: 0,
              videos_completed: 0,
              progress_percentage: 0,
            };
          }
          
          // Get topics
          const { data: topics } = await supabase
            .from('learning_topics')
            .select('id')
            .in('category_id', categories.map(c => c.id))
            .eq('is_active', true);
          
          if (!topics || topics.length === 0) {
            return {
              subject: subject as Subject,
              videos_ready: 0,
              videos_completed: 0,
              progress_percentage: 0,
            };
          }
          
          // Get all videos for these topics
          const { data: allVideos } = await supabase
            .from('learning_videos')
            .select('*')
            .in('topic_id', topics.map(t => t.id))
            .eq('is_active', true);
          
          if (!allVideos) {
            return {
              subject: subject as Subject,
              videos_ready: 0,
              videos_completed: 0,
              progress_percentage: 0,
            };
          }
          
          // Filter videos by user's age/level
          const suitableVideos = filterContentByUserLevel(
            allVideos as any,
            userLevelData?.level || null,
            userLevelData?.age || null
          );
          
          const videos_ready = suitableVideos.length;
          
          // Count completed videos if user is logged in
          let videos_completed = 0;
          if (user && videos_ready > 0) {
            const videoIds = suitableVideos.map((v: any) => v.id);
            const { count } = await supabase
              .from('user_learning_progress')
              .select('video_id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('progress_type', 'video_completed')
              .in('video_id', videoIds);
            
            videos_completed = count || 0;
          }
          
          const progress_percentage = videos_ready > 0 
            ? Math.round((videos_completed / videos_ready) * 100)
            : 0;
          
          return {
            subject: subject as Subject,
            videos_ready,
            videos_completed,
            progress_percentage,
          };
        })
      );
      
      return subjectsWithProgress;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
