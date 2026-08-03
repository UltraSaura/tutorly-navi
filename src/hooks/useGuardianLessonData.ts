import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const XP_PER_LESSON = 5;

export interface ChildLessonStats {
  childUserId: string;
  lessonsCompleted: number;
  lessonsThisWeek: number;
  totalXp: number;
  currentStreak: number;
  activeToday: boolean;
  streakAtRisk: boolean;
  recentLessons: {
    topicId: string;
    topicName: string;
    completedAt: string;
    timeSpentSeconds: number;
  }[];
}

function toLocalDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA');
}

function computeStreak(dates: string[]): {
  current: number;
  activeToday: boolean;
  streakAtRisk: boolean;
} {
  if (!dates.length) return { current: 0, activeToday: false, streakAtRisk: false };

  const unique = [...new Set(dates.map(toLocalDate))].sort().reverse();
  const today = toLocalDate(new Date().toISOString());
  const yesterday = toLocalDate(new Date(Date.now() - 86_400_000).toISOString());

  const activeToday = unique[0] === today;
  const hadYesterday = unique.includes(yesterday);
  const streakAtRisk = !activeToday && hadYesterday;

  const startDate = activeToday ? today : hadYesterday ? yesterday : null;
  let current = 0;

  if (startDate) {
    current = 1;
    const idx = unique.indexOf(startDate);
    for (let i = idx + 1; i < unique.length; i += 1) {
      const diff = Math.round(
        (new Date(unique[i - 1]).getTime() - new Date(unique[i]).getTime()) / 86_400_000
      );
      if (diff === 1) current += 1;
      else break;
    }
  }

  return { current, activeToday, streakAtRisk };
}

function emptyStats(childUserId: string): ChildLessonStats {
  return {
    childUserId,
    lessonsCompleted: 0,
    lessonsThisWeek: 0,
    totalXp: 0,
    currentStreak: 0,
    activeToday: false,
    streakAtRisk: false,
    recentLessons: [],
  };
}

export function useGuardianLessonData(
  guardianId: string | undefined,
  childUserIds: string[]
) {
  const queryClient = useQueryClient();

  const { data: lessonRows, isLoading } = useQuery({
    queryKey: ['guardian-lesson-data', guardianId, childUserIds],
    queryFn: async (): Promise<ChildLessonStats[]> => {
      if (!guardianId || !childUserIds.length) return [];

      const { data: progress, error } = await supabase
        .from('user_learning_progress')
        .select('user_id, topic_id, time_spent_seconds, created_at')
        .in('user_id', childUserIds)
        .eq('progress_type', 'lesson_completed')
        .order('created_at', { ascending: false });

      if (error || !progress?.length) {
        return childUserIds.map(emptyStats);
      }

      const topicIds = [...new Set(progress.map((row) => row.topic_id).filter(Boolean))];
      const { data: topics } = await supabase
        .from('topics')
        .select('id, name')
        .in('id', topicIds);

      const topicMap = new Map((topics ?? []).map((topic) => [topic.id, topic.name]));
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

      return childUserIds.map((uid) => {
        const rows = progress.filter((row) => row.user_id === uid);
        const weekRows = rows.filter((row) => row.created_at >= weekAgo);
        const { current, activeToday, streakAtRisk } = computeStreak(
          rows.map((row) => row.created_at)
        );

        return {
          childUserId: uid,
          lessonsCompleted: rows.length,
          lessonsThisWeek: weekRows.length,
          totalXp: rows.length * XP_PER_LESSON,
          currentStreak: current,
          activeToday,
          streakAtRisk,
          recentLessons: rows.slice(0, 5).map((row) => ({
            topicId: row.topic_id ?? '',
            topicName: topicMap.get(row.topic_id ?? '') ?? 'Leçon',
            completedAt: row.created_at,
            timeSpentSeconds: row.time_spent_seconds ?? 0,
          })),
        };
      });
    },
    enabled: !!guardianId && childUserIds.length > 0,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!guardianId || !childUserIds.length) return;

    const channel = supabase.channel('guardian-lesson-updates');
    childUserIds.forEach((userId) => {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_learning_progress',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['guardian-lesson-data', guardianId],
          });
        }
      );
    });
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [guardianId, childUserIds.join(','), queryClient]);

  return {
    lessonStats: lessonRows ?? [],
    isLoading,
    getChildStats: (userId: string): ChildLessonStats | undefined =>
      lessonRows?.find((stats) => stats.childUserId === userId),
  };
}
