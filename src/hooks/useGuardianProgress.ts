import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SubjectProgress {
  name: string;
  progress: number;
  exercisesCompleted: number;
  totalExercises: number;
  successRate: number;
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

        const subjects: SubjectProgress[] = Array.from(subjectMap.entries()).map(([name, stats]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          progress: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          exercisesCompleted: stats.correct,
          totalExercises: stats.total,
          successRate: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
        }));

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
