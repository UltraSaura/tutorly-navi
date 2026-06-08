import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserCurriculumProfile } from './useUserCurriculumProfile';
import { useAdminAuth } from './useAdminAuth';
import { useActiveSchoolLevel } from './useActiveSchoolLevel';
import type { Subject, Category, Topic } from '@/types/learning';
import { normalizeSchoolLevel } from '@/domain/schoolLevels';

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
  const { profile } = useUserCurriculumProfile();
  const { isAdmin } = useAdminAuth();
  const activeSchoolLevel = useActiveSchoolLevel();
  const effectiveCountryCode = profile?.countryCode ?? (activeSchoolLevel.isPreviewing ? 'fr' : undefined);
  const effectiveLevelCode = activeSchoolLevel.normalizedLevel ?? profile?.levelCode;
  
  return useQuery({
    queryKey: ['subject-dashboard', subjectSlug, isAdmin, effectiveCountryCode, effectiveLevelCode, activeSchoolLevel.isPreviewing],
    queryFn: async (): Promise<SubjectDashboardData> => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get subject
      const { data: subject, error: subjectError } = await (supabase as any)
        .from('subjects')
        .select('*')
        .eq('slug', subjectSlug)
        .eq('is_active', true)
        .single();

      if (subjectError) throw subjectError;

      // Get categories with topics, then normalize/filter curriculum fields client-side.
      // Some imported curriculum rows differ in casing/format, so exact DB filters can hide valid topics.
      const topicsQuery = supabase
        .from('learning_categories')
        .select(`
          *,
          topics:topics!inner(*)
        `)
        .eq('subject_id', (subject as any).id)
        .eq('is_active', true)
        .eq('topics.is_active', true);

      const { data: categories, error: categoriesError } = await topicsQuery.order('order_index');

      if (categoriesError) throw categoriesError;
      const shouldFilterCurriculum = (activeSchoolLevel.isPreviewing || !isAdmin) && effectiveCountryCode && effectiveLevelCode;
      const normalizedCountry = String(effectiveCountryCode || '').trim().toLowerCase();
      const normalizedLevel = normalizeSchoolLevel(effectiveLevelCode);
      const curriculumFilteredCategories = (categories as any[]).map((category) => ({
        ...category,
        topics: shouldFilterCurriculum
          ? (category.topics || []).filter((topic: any) => {
              const topicCountry = String(topic.curriculum_country_code || '').trim().toLowerCase();
              return topicCountry === normalizedCountry && normalizeSchoolLevel(topic.curriculum_level_code) === normalizedLevel;
            })
          : (category.topics || []),
      })).filter((category) => (category.topics || []).length > 0);

      // Calculate progress for each topic if user is logged in
      let categoriesWithProgress = curriculumFilteredCategories;
      if (user) {
        categoriesWithProgress = await Promise.all(
          curriculumFilteredCategories.map(async (category: any) => {
            const topicsWithProgress = await Promise.all(
              (category.topics || []).map(async (topic: any) => {
                const { data: videos } = await (supabase as any)
                  .from('videos')
                  .select('id')
                  .eq('topic_id', topic.id)
                  .eq('is_active', true);

                const videoIds = (videos as any[])?.map((v: any) => v.id) || [];
                
                if (videoIds.length === 0) {
                  return { ...topic, completed_videos: 0, progress_percentage: 0 };
                }

                const { count: completedCount } = await (supabase as any)
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

      let lessonCompletedTopicIds = new Set<string>();
      if (user) {
        const allTopicIds = curriculumFilteredCategories
          .flatMap((category: any) => (category.topics || []).map((topic: any) => topic.id));

        if (allTopicIds.length > 0) {
          const { data: lessonProgress } = await supabase
            .from('user_learning_progress')
            .select('topic_id')
            .eq('user_id', user.id)
            .eq('progress_type', 'lesson_completed')
            .in('topic_id', allTopicIds);

          lessonCompletedTopicIds = new Set(
            (lessonProgress ?? []).map((row: any) => row.topic_id).filter(Boolean)
          );
        }
      }

      categoriesWithProgress = categoriesWithProgress.map((category: any) => ({
        ...category,
        topics: (category.topics || []).map((topic: any) => ({
          ...topic,
          has_lesson: !!topic.lesson_content,
          lesson_completed: lessonCompletedTopicIds.has(topic.id),
        })),
      }));

      // Calculate overall progress
      const allTopics = categoriesWithProgress.flatMap((c: any) => c.topics || []);
      const completedTopics = allTopics.filter((topic: any) =>
        (topic.progress_percentage || 0) === 100 || topic.lesson_completed === true
      ).length;
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
