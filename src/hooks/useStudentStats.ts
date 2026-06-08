import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const XP_PER_LESSON = 5;

export interface StudentStats {
  totalXp: number;
  lessonsCompleted: number;
  level: number;
  xpToNextLevel: number;
  xpProgressInLevel: number;
}

function calculateLevel(totalXp: number): { level: number; xpToNextLevel: number; progress: number } {
  const XP_PER_LEVEL = 50;
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpInCurrentLevel = totalXp % XP_PER_LEVEL;

  return {
    level,
    xpToNextLevel: XP_PER_LEVEL - xpInCurrentLevel,
    progress: xpInCurrentLevel / XP_PER_LEVEL,
  };
}

export function useStudentStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-stats', user?.id],
    queryFn: async (): Promise<StudentStats> => {
      if (!user?.id) {
        return { totalXp: 0, lessonsCompleted: 0, level: 1, xpToNextLevel: 50, xpProgressInLevel: 0 };
      }

      const { count } = await supabase
        .from('user_learning_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('progress_type', 'lesson_completed');

      const lessonsCompleted = count ?? 0;
      const totalXp = lessonsCompleted * XP_PER_LESSON;
      const { level, xpToNextLevel, progress } = calculateLevel(totalXp);

      return { totalXp, lessonsCompleted, level, xpToNextLevel, xpProgressInLevel: progress };
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
}
