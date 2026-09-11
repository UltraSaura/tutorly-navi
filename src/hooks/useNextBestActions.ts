import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useStudentCurriculum } from '@/hooks/useStudentCurriculum';
import { supabase } from '@/integrations/supabase/client';
import { getNextBestActions } from '@/services/nextBestActionService';
import type { RecommendationCurriculumTopic } from '@/types/recommendation';

export function useNextBestActions() {
  const { user } = useAuth();
  const { subjects, isLoading: curriculumLoading, error: curriculumError } = useStudentCurriculum();

  const curriculum: RecommendationCurriculumTopic[] = subjects.flatMap((subject) =>
    subject.domains.flatMap((domain) =>
      domain.subdomains.flatMap((subdomain) =>
        subdomain.topics.map((topic) => ({
          subjectId: subject.id,
          subjectName: subject.subjectLabel,
          subjectSlug: subject.slug,
          topicId: topic.id,
          topicName: topic.topicLabel,
          topicSlug: topic.slug,
          orderIndex: subject.orderIndex * 10000 + topic.orderIndex,
          estimatedMinutes: topic.estimatedDurationMinutes,
        })),
      ),
    ),
  );

  const evidence = useQuery({
    queryKey: ['home-next-best-action-evidence', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [progressResult, homeworkResult] = await Promise.all([
        supabase
          .from('user_learning_progress')
          .select('topic_id, subject_id, progress_type, progress_percentage, updated_at')
          .eq('user_id', user!.id)
          .order('updated_at', { ascending: false })
          .limit(100),
        supabase
          .from('exercise_history')
          .select('id, subject_id, topic_id, is_correct, attempts_count, updated_at')
          .eq('user_id', user!.id)
          .order('updated_at', { ascending: false })
          .limit(50),
      ]);

      // Recommendation evidence is fail-open: one unavailable source must not make Home unusable.
      if (progressResult.error && import.meta.env.DEV) console.warn('[Home] progress evidence unavailable', progressResult.error);
      if (homeworkResult.error && import.meta.env.DEV) console.warn('[Home] homework evidence unavailable', homeworkResult.error);

      return {
        progress: (progressResult.data ?? []).filter((row) => Boolean(row.topic_id)).map((row) => ({
          topicId: row.topic_id as string,
          subjectId: row.subject_id,
          progressType: row.progress_type,
          progressPercentage: row.progress_percentage,
          updatedAt: row.updated_at,
        })),
        homework: (homeworkResult.data ?? []).map((row) => ({
          id: row.id,
          subjectId: row.subject_id,
          topicId: row.topic_id,
          isCorrect: row.is_correct,
          attemptsCount: row.attempts_count,
          updatedAt: row.updated_at,
        })),
      };
    },
    staleTime: 60_000,
  });

  const actions = user?.id
    ? getNextBestActions({
        studentId: user.id,
        curriculum,
        progress: evidence.data?.progress ?? [],
        homework: evidence.data?.homework ?? [],
      })
    : [];

  return {
    actions,
    subjects,
    isLoading: curriculumLoading || evidence.isLoading,
    error: curriculumError ?? evidence.error ?? null,
  };
}
