import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useStudentCurriculum } from '@/hooks/useStudentCurriculum';
import { supabase } from '@/integrations/supabase/client';
import { getNextBestActions } from '@/services/nextBestActionService';
import { fetchSpacedReviewStates } from '@/services/spacedReviewRepository';
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
      const [progressResult, homeworkResult, reviewResult] = await Promise.all([
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
        fetchSpacedReviewStates(user!.id).then((data) => ({ data, error: null })).catch((error) => ({ data: [], error })),
      ]);

      if (progressResult.error && import.meta.env.DEV) console.warn('[Home] progress evidence unavailable', progressResult.error);
      if (homeworkResult.error && import.meta.env.DEV) console.warn('[Home] homework evidence unavailable', homeworkResult.error);
      if (reviewResult.error && import.meta.env.DEV) console.warn('[Home] spaced review evidence unavailable', reviewResult.error);

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
        spacedReviews: reviewResult.data.map((review) => ({
          subjectId: review.subjectId,
          subjectSlug: review.subjectId,
          conceptId: review.conceptId,
          objectiveId: review.objectiveId,
          stage: review.stage,
          nextReviewAt: review.nextReviewAt,
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
        spacedReviews: evidence.data?.spacedReviews ?? [],
      })
    : [];

  return {
    actions,
    subjects,
    isLoading: curriculumLoading || evidence.isLoading,
    error: curriculumError ?? evidence.error ?? null,
  };
}
