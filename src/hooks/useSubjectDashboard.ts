import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Subject, Category, Topic } from '@/types/learning';

interface SubjectDashboardData {
  subject: Subject | null;
  categories: (Category & { topics: Topic[] })[];
  overallProgress: {
    percentage: number;
    completedTopics: number;
    totalTopics: number;
  };
}

export function useSubjectDashboard(subjectSlug: string) {
  return useQuery({
    queryKey: ['subject-dashboard', subjectSlug],
    queryFn: async (): Promise<SubjectDashboardData> => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get subject
      const { data: subject, error: subjectError } = await supabase
        .from('learning_subjects')
        .select('*')
        .eq('slug', subjectSlug)
        .eq('is_active', true)
        .single();

      if (subjectError) throw subjectError;

      // Get categories with topics
      const { data: categories, error: categoriesError } = await supabase
        .from('learning_categories')
        .select(`
          *,
          topics:learning_topics(*)
        `)
        .eq('subject_id', (subject as any).id)
        .eq('is_active', true)
        .order('order_index');

      if (categoriesError) throw categoriesError;

      // Calculate progress for each topic if user is logged in
      let categoriesWithProgress = categories as any[];
      if (user) {
        categoriesWithProgress = await Promise.all(
          (categories as any[]).map(async (category: any) => {
            const topicsWithProgress = await Promise.all(
              (category.topics || []).map(async (topic: any) => {
                const { data: videos } = await supabase
                  .from('learning_videos')
                  .select('id')
                  .eq('topic_id', topic.id)
                  .eq('is_active', true);

                const videoIds = (videos as any[])?.map((v: any) => v.id) || [];
                
                if (videoIds.length === 0) {
                  return { ...topic, completed_videos: 0, progress_percentage: 0 };
                }

                const { count: completedCount } = await supabase
                  .from('user_learning_progress')
                  .select('video_id', { count: 'exact', head: true })
                  .eq('user_id', user.id)
                  .eq('progress_type', 'video_completed')
                  .in('video_id', videoIds);

                const progress = Math.round((completedCount || 0) / videoIds.length * 100);

                return {
                  ...topic,
                  completed_videos: completedCount || 0,
                  progress_percentage: progress,
                };
              })
            );

            return {
              ...category,
              topics: topicsWithProgress,
            };
          })
        );
      }

      // Calculate overall progress
      const allTopics = categoriesWithProgress.flatMap((c: any) => c.topics || []);
      const completedTopics = allTopics.filter((t: any) => (t.progress_percentage || 0) === 100).length;
      const overallPercentage = allTopics.length > 0 
        ? Math.round(completedTopics / allTopics.length * 100)
        : 0;

      return {
        subject: subject as Subject,
        categories: categoriesWithProgress as (Category & { topics: Topic[] })[],
        overallProgress: {
          percentage: overallPercentage,
          completedTopics,
          totalTopics: allTopics.length,
        },
      };
    },
    enabled: !!subjectSlug,
    staleTime: 5 * 60 * 1000,
  });
}
