import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Subject, SubjectProgress } from '@/types/learning';
import { useActiveSchoolLevel } from './useActiveSchoolLevel';
import { useUserCurriculumProfile } from './useUserCurriculumProfile';
import { filterContentByUserLevel } from '@/utils/schoolLevelFilter';

export function useLearningSubjects() {
  const activeSchoolLevel = useActiveSchoolLevel();
  const { profile } = useUserCurriculumProfile();
  const effectiveCountryCode = profile?.countryCode ?? (activeSchoolLevel.isPreviewing ? 'fr' : undefined);
  const effectiveLevelCode = activeSchoolLevel.normalizedLevel ?? profile?.levelCode;

  return useQuery({
    queryKey: ['learning-subjects', activeSchoolLevel.activeLevel, effectiveCountryCode, effectiveLevelCode],
    queryFn: async (): Promise<SubjectProgress[]> => {
      const { data: { user } } = await supabase.auth.getUser();

      // Step 1: all active subjects — no !inner join, no display_context restriction
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (subjectsError) throw subjectsError;
      if (!subjects) return [];

      // Step 2: for each subject count lessons + videos via curriculum_subject_id
      const subjectsWithProgress = await Promise.all(
        subjects.map(async (subject) => {
          // Topics via curriculum_subject_id — same approach that works in S'exercer
          const { data: allTopics } = await supabase
            .from('topics')
            .select('id, lesson_content, curriculum_country_code, curriculum_level_code')
            .eq('curriculum_subject_id', subject.id)
            .eq('is_active', true);

          // Client-side curriculum filter (permissive: null = universal)
          const topics = (allTopics ?? []).filter(t => {
            if (effectiveCountryCode && t.curriculum_country_code && t.curriculum_country_code !== effectiveCountryCode) return false;
            if (effectiveLevelCode && t.curriculum_level_code && t.curriculum_level_code !== effectiveLevelCode) return false;
            return true;
          });

          const lessons_ready = topics.filter(t => t.lesson_content !== null).length;

          if (topics.length === 0) {
            return { subject: subject as Subject, videos_ready: 0, videos_completed: 0, progress_percentage: 0 };
          }

          // Count videos
          const { data: allVideos } = await supabase
            .from('videos')
            .select('*')
            .in('topic_id', topics.map(t => t.id))
            .eq('is_active', true);

          const suitableVideos = filterContentByUserLevel(
            (allVideos ?? []) as any,
            activeSchoolLevel.activeLevel,
            activeSchoolLevel.age
          );

          const videos_ready = suitableVideos.length;
          const content_ready = videos_ready + lessons_ready;

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

          let lessons_completed = 0;
          if (user && topics.length > 0) {
            const { count } = await supabase
              .from('user_learning_progress')
              .select('topic_id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('progress_type', 'lesson_completed')
              .in('topic_id', topics.map((t: any) => t.id));

            lessons_completed = count || 0;
          }

          const progress_percentage = videos_ready > 0
            ? Math.round((videos_completed / videos_ready) * 100)
            : 0;

          return {
            subject: subject as Subject,
            videos_ready: content_ready,
            videos_completed,
            lessons_completed,
            progress_percentage,
          };
        })
      );

      // Only return subjects that have actual content
      return subjectsWithProgress.filter(s => s.videos_ready > 0);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePracticeSubjectButtons() {
  return useQuery({
    queryKey: ['practice-subject-buttons'],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await (supabase as any)
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .in('display_context', ['practice', 'both'])
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data ?? []) as Subject[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
