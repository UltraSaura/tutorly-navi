import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface LessonHistoryEntry {
  id: string;
  topic_id: string;
  topic_name: string;
  subject_name: string;
  time_spent_seconds: number;
  created_at: string;
}

export function useLessonHistory(limit = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lesson-history', user?.id, limit],
    queryFn: async (): Promise<LessonHistoryEntry[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_learning_progress')
        .select(`
          id,
          topic_id,
          time_spent_seconds,
          created_at
        `)
        .eq('user_id', user.id)
        .eq('progress_type', 'lesson_completed')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data?.length) return [];

      const topicIds = [...new Set(data.map((row) => row.topic_id).filter(Boolean))];
      const { data: topics } = topicIds.length > 0
        ? await supabase
            .from('topics')
            .select(`
              id, name,
              learning_categories (
                subjects ( name )
              )
            `)
            .in('id', topicIds)
        : { data: [] as any[] };

      const topicMap = new Map(
        (topics ?? []).map((topic: any) => [
          topic.id,
          {
            name: topic.name,
            subject: (topic.learning_categories as any)?.subjects?.name ?? 'Matieres',
          },
        ])
      );

      return data.map((row) => ({
        id: row.id,
        topic_id: row.topic_id ?? '',
        topic_name: topicMap.get(row.topic_id ?? '')?.name ?? 'Lecon',
        subject_name: topicMap.get(row.topic_id ?? '')?.subject ?? '',
        time_spent_seconds: row.time_spent_seconds ?? 0,
        created_at: row.created_at,
      }));
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}
