import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SubjectProgress {
  name: string;
  progress: number;
  exercisesCompleted: number;
  totalExercises: number;
  successRate: number;
  trend: "up" | "down" | "flat";
  next?: {
    type: string;
    date: string;
  };
}

interface ChildProgress {
  id: string;
  name: string;
  overallProgress: number;
  subjects: SubjectProgress[];
  recentAchievements: Array<{
    title: string;
    date: string;
  }>;
}

export const useGuardianProgress = (guardianId?: string, childId?: string) => {
  return useQuery({
    queryKey: ['guardian-progress', guardianId, childId],
    queryFn: async (): Promise<ChildProgress[]> => {
      if (!guardianId) return [];

      // Get children
      const { data: childLinks, error: linksError } = await supabase
        .from('guardian_child_links')
        .select('child_id, children!inner(id, user_id, users!inner(first_name, last_name))')
        .eq('guardian_id', guardianId);

      if (linksError) throw linksError;
      if (!childLinks) return [];

      const targetChildren = childId
        ? childLinks.filter(link => link.children.id === childId)
        : childLinks;

      // Process each child's progress
      const progressData: ChildProgress[] = [];

      for (const link of targetChildren) {
        const child = link.children;
        const childName = `${child.users.first_name} ${child.users.last_name}`;

        // Fetch exercise history
        const { data: exercises, error: exercisesError } = await supabase
          .from('exercise_history')
          .select('*')
          .eq('user_id', child.user_id);

        if (exercisesError) continue;

        const totalExercises = exercises?.length || 0;
        const correctExercises = exercises?.filter(ex => ex.is_correct === true).length || 0;
        const overallProgress = totalExercises > 0 
          ? Math.round((correctExercises / totalExercises) * 100) 
          : 0;

        // Calculate subject-wise progress
        const subjectMap = new Map<string, { correct: number; total: number }>();
        
        exercises?.forEach(ex => {
          const subject = ex.subject_id || 'general';
          const current = subjectMap.get(subject) || { correct: 0, total: 0 };
          current.total++;
          if (ex.is_correct === true) current.correct++;
          subjectMap.set(subject, current);
        });

        const subjects: SubjectProgress[] = Array.from(subjectMap.entries()).map(([name, stats]) => {
          // Calculate trend: compare recent (last 7 days) vs previous performance
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

          const recentExercises = exercises?.filter(
            ex => ex.subject_id === name && new Date(ex.created_at) >= sevenDaysAgo
          ) || [];
          const previousExercises = exercises?.filter(
            ex => ex.subject_id === name && 
            new Date(ex.created_at) >= fourteenDaysAgo && 
            new Date(ex.created_at) < sevenDaysAgo
          ) || [];

          const recentRate = recentExercises.length > 0
            ? (recentExercises.filter(ex => ex.is_correct).length / recentExercises.length) * 100
            : 0;
          const previousRate = previousExercises.length > 0
            ? (previousExercises.filter(ex => ex.is_correct).length / previousExercises.length) * 100
            : 0;

          let trend: "up" | "down" | "flat" = "flat";
          if (recentExercises.length >= 3 && previousExercises.length >= 3) {
            if (recentRate > previousRate + 5) trend = "up";
            else if (recentRate < previousRate - 5) trend = "down";
          }

          // Always determine next activity type and date based on exercise count
          const exerciseCount = stats.total;
          let next: { type: string; date: string };
          
          // Calculate what's next based on current progress
          const exercisesUntilTest = 10 - (exerciseCount % 10);
          const exercisesUntilQuiz = 5 - (exerciseCount % 5);
          
          let nextType: string;
          let exercisesUntil: number;
          
          // Determine the nearest upcoming milestone
          if (exercisesUntilTest <= 1) {
            nextType = "Test";
            exercisesUntil = exercisesUntilTest;
          } else if (exercisesUntilQuiz <= 1) {
            nextType = "Quiz";
            exercisesUntil = exercisesUntilQuiz;
          } else if (exercisesUntilQuiz < exercisesUntilTest) {
            nextType = "Quiz";
            exercisesUntil = exercisesUntilQuiz;
          } else {
            nextType = "Test";
            exercisesUntil = exercisesUntilTest;
          }
          
          // Calculate a dummy date (1-7 days from now based on exercises remaining)
          const daysAhead = Math.max(1, Math.min(exercisesUntil, 7));
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + daysAhead);
          const formattedDate = nextDate.toISOString().split('T')[0]; // YYYY-MM-DD
          
          next = { type: nextType, date: formattedDate };

          return {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            progress: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
            exercisesCompleted: stats.correct,
            totalExercises: stats.total,
            successRate: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
            trend,
            next,
          };
        });

        // Calculate recent achievements
        const recentAchievements: Array<{ title: string; date: string }> = [];
        
        // Achievement: 10+ exercises completed
        if (totalExercises >= 10) {
          const latestDate = exercises?.[0]?.created_at || new Date().toISOString();
          recentAchievements.push({
            title: `Completed ${totalExercises} exercises`,
            date: latestDate.split('T')[0]
          });
        }

        // Achievement: 100% on recent exercises
        const recentExercises = exercises?.slice(0, 5) || [];
        if (recentExercises.length >= 5 && recentExercises.every(ex => ex.is_correct === true)) {
          recentAchievements.push({
            title: '5 Perfect Scores in a Row',
            date: recentExercises[0].created_at.split('T')[0]
          });
        }

        // Achievement: High success rate
        if (totalExercises >= 5 && overallProgress >= 80) {
          recentAchievements.push({
            title: `${overallProgress}% Success Rate`,
            date: new Date().toISOString().split('T')[0]
          });
        }

        progressData.push({
          id: child.id,
          name: childName,
          overallProgress,
          subjects,
          recentAchievements
        });
      }

      return progressData;
    },
    enabled: !!guardianId,
  });
};
