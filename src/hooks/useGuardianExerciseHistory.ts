import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ExerciseHistoryWithAttempts } from '@/types/exercise-history';

interface UseGuardianExerciseHistoryOptions {
  guardianId?: string;
  childId?: string;
  subjectId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isCorrect?: boolean;
}

interface ChildInfo {
  id: string;
  user_id: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  status: string;
}

export const useGuardianExerciseHistory = (options: UseGuardianExerciseHistoryOptions) => {
  const { guardianId, childId, subjectId, dateFrom, dateTo, isCorrect } = options;

  // Fetch children linked to guardian
  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: ['guardian-children', guardianId],
    queryFn: async () => {
      if (!guardianId) return [];

      const { data, error } = await supabase
        .from('guardian_child_links')
        .select(`
          child_id,
          children!inner(
            id,
            user_id,
            grade,
            status,
            users!inner(first_name, last_name)
          )
        `)
        .eq('guardian_id', guardianId);

      if (error) throw error;

      return (data || []).map((link: any) => ({
        id: link.children.id,
        user_id: link.children.user_id,
        firstName: link.children.users.first_name || '',
        lastName: link.children.users.last_name || '',
        grade: link.children.grade,
        status: link.children.status,
      })) as ChildInfo[];
    },
    enabled: !!guardianId,
  });

  // Fetch exercise history for selected child(ren)
  const { data: exerciseHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['guardian-exercise-history', guardianId, childId, subjectId, dateFrom, dateTo, isCorrect],
    queryFn: async () => {
      if (!guardianId) return [];

      const childUserIds = childId
        ? [children?.find((c) => c.id === childId)?.user_id].filter(Boolean)
        : children?.map((c) => c.user_id) || [];

      if (childUserIds.length === 0) return [];

      let query = supabase
        .from('exercise_history')
        .select(`
          *,
          attempts:exercise_attempts(*)
        `)
        .in('user_id', childUserIds)
        .order('created_at', { ascending: false });

      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      if (isCorrect !== undefined) {
        query = query.eq('is_correct', isCorrect);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Manually join explanations by exercise_content match
      const exercisesWithExplanations = await Promise.all(
        (data || []).map(async (exercise) => {
          const { data: explanation } = await supabase
            .from('exercise_explanations_cache')
            .select('*')
            .like('exercise_content', `${exercise.exercise_content}%`)
            .maybeSingle();

          return {
            ...exercise,
            explanation: explanation || null
          };
        })
      );

      return exercisesWithExplanations as ExerciseHistoryWithAttempts[];
    },
    enabled: !!guardianId && !!children && children.length > 0,
  });

  const getStats = () => {
    if (!exerciseHistory) {
      return {
        totalExercises: 0,
        correctExercises: 0,
        totalAttempts: 0,
        successRate: 0,
      };
    }

    const totalExercises = exerciseHistory.length;
    const correctExercises = exerciseHistory.filter((ex) => ex.is_correct === true).length;
    const totalAttempts = exerciseHistory.reduce((sum, ex) => sum + ex.attempts_count, 0);
    const successRate = totalExercises > 0 ? (correctExercises / totalExercises) * 100 : 0;

    return {
      totalExercises,
      correctExercises,
      totalAttempts,
      successRate: Math.round(successRate),
    };
  };

  return {
    children: children || [],
    exerciseHistory: exerciseHistory || [],
    loading: childrenLoading || historyLoading,
    stats: getStats(),
  };
};
