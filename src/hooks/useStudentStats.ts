import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const XP_PER_LESSON = 5;
const XP_PER_LEVEL = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface StudentStats {
  totalXp: number;
  lessonsCompleted: number;
  level: number;
  xpToNextLevel: number;
  xpProgressInLevel: number;
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
  streakAtRisk: boolean;
}

function toLocalDateString(input: string) {
  const date = new Date(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function calculateLevel(totalXp: number): { level: number; xpToNextLevel: number; progress: number } {
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpInCurrentLevel = totalXp % XP_PER_LEVEL;

  return {
    level,
    xpToNextLevel: XP_PER_LEVEL - xpInCurrentLevel,
    progress: xpInCurrentLevel / XP_PER_LEVEL,
  };
}

function calculateStreaks(rows: Array<{ created_at: string | null }>) {
  const uniqueDays = Array.from(
    new Set(
      rows
        .map((row) => row.created_at)
        .filter((value): value is string => Boolean(value))
        .map(toLocalDateString)
    )
  ).sort();

  if (uniqueDays.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      activeToday: false,
      streakAtRisk: false,
    };
  }

  let longestStreak = 1;
  let running = 1;

  for (let i = 1; i < uniqueDays.length; i += 1) {
    const previous = parseDateOnly(uniqueDays[i - 1]);
    const current = parseDateOnly(uniqueDays[i]);
    const diffDays = Math.round((current.getTime() - previous.getTime()) / DAY_MS);

    if (diffDays === 1) {
      running += 1;
      longestStreak = Math.max(longestStreak, running);
    } else if (diffDays > 1) {
      running = 1;
    }
  }

  const today = new Date();
  const todayKey = toLocalDateString(today.toISOString());
  const lastDayKey = uniqueDays[uniqueDays.length - 1];
  const lastDayDate = parseDateOnly(lastDayKey);
  const todayDate = parseDateOnly(todayKey);
  const daysSinceLast = Math.round((todayDate.getTime() - lastDayDate.getTime()) / DAY_MS);

  const activeToday = lastDayKey === todayKey;
  const streakAtRisk = daysSinceLast === 1;

  let trailingStreak = 1;
  for (let i = uniqueDays.length - 1; i > 0; i -= 1) {
    const current = parseDateOnly(uniqueDays[i]);
    const previous = parseDateOnly(uniqueDays[i - 1]);
    const diffDays = Math.round((current.getTime() - previous.getTime()) / DAY_MS);

    if (diffDays === 1) {
      trailingStreak += 1;
    } else {
      break;
    }
  }

  return {
    currentStreak: activeToday || streakAtRisk ? trailingStreak : 0,
    longestStreak,
    activeToday,
    streakAtRisk,
  };
}

export function useStudentStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-stats', user?.id],
    queryFn: async (): Promise<StudentStats> => {
      if (!user?.id) {
        return {
          totalXp: 0,
          lessonsCompleted: 0,
          level: 1,
          xpToNextLevel: XP_PER_LEVEL,
          xpProgressInLevel: 0,
          currentStreak: 0,
          longestStreak: 0,
          activeToday: false,
          streakAtRisk: false,
        };
      }

      const { data: progressRows, error } = await supabase
        .from('user_learning_progress')
        .select('id, created_at')
        .eq('user_id', user.id)
        .eq('progress_type', 'lesson_completed')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      const lessonsCompleted = progressRows?.length ?? 0;
      const totalXp = lessonsCompleted * XP_PER_LESSON;
      const { level, xpToNextLevel, progress } = calculateLevel(totalXp);
      const streaks = calculateStreaks(progressRows ?? []);

      return {
        totalXp,
        lessonsCompleted,
        level,
        xpToNextLevel,
        xpProgressInLevel: progress,
        ...streaks,
      };
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
}
