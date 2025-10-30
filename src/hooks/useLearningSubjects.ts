import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Subject, SubjectProgress } from '@/types/learning';

export function useLearningSubjects() {
  return useQuery({
    queryKey: ['learning-subjects'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get all active subjects
      const { data: subjects, error } = await (supabase as any)
        .from('learning_subjects')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;

      if (!user) {
        return (subjects as any[]).map((subject: any) => ({
          subject,
          videos_ready: 0,
          videos_completed: 0,
          progress_percentage: 0,
        })) as SubjectProgress[];
      }

      // Get progress for each subject
      const subjectProgress = await Promise.all(
        (subjects as any[]).map(async (subject: any) => {
          // Get topics for this subject through categories
          const { data: categories } = await supabase
            .from('learning_categories')
            .select('id')
            .eq('subject_id', subject.id)
            .eq('is_active', true);

          const categoryIds = categories?.map(c => c.id) || [];

          if (categoryIds.length === 0) {
            return {
              subject,
              videos_ready: 0,
              videos_completed: 0,
              progress_percentage: 0,
            };
          }

          const { data: topics } = await supabase
            .from('learning_topics')
            .select('id')
            .in('category_id', categoryIds)
            .eq('is_active', true);

          const topicIds = topics?.map(t => t.id) || [];

          if (topicIds.length === 0) {
            return {
              subject,
              videos_ready: 0,
              videos_completed: 0,
              progress_percentage: 0,
            };
          }

          // Get total videos for this subject's topics
          const { count: totalVideos } = await supabase
            .from('learning_videos')
            .select('id', { count: 'exact', head: true })
            .in('topic_id', topicIds)
            .eq('is_active', true);

          // Get video IDs for this subject
          const { data: subjectVideos } = await supabase
            .from('learning_videos')
            .select('id')
            .in('topic_id', topicIds)
            .eq('is_active', true);

          const videoIds = subjectVideos?.map(v => v.id) || [];

          // Get completed videos for this subject
          const { count: completedVideos } = videoIds.length > 0 ? await supabase
            .from('user_learning_progress')
            .select('video_id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('video_id', videoIds)
            .eq('progress_type', 'video_completed') : { count: 0 };

          const progress = totalVideos ? Math.round((completedVideos || 0) / totalVideos * 100) : 0;

          return {
            subject,
            videos_ready: totalVideos || 0,
            videos_completed: completedVideos || 0,
            progress_percentage: progress,
          };
        })
      );

      return subjectProgress as SubjectProgress[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
