import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  StudentMastery,
  CurriculumTaskAttempt,
  LessonSession,
  ObjectiveMasteryProgress,
  MasteryStats,
} from '@/types/mastery';
import type { ObjectiveWithSuccessCriteria } from '@/types/curriculum';

// Fetch student mastery for a child
export const useStudentMastery = (childId?: string) => {
  return useQuery({
    queryKey: ['student-mastery', childId],
    queryFn: async () => {
      if (!childId) return [];

      const { data, error } = await supabase
        .from('student_mastery')
        .select('*')
        .eq('child_id', childId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as StudentMastery[];
    },
    enabled: !!childId,
  });
};

// Fetch mastery for a specific objective
export const useObjectiveMastery = (childId?: string, objectiveId?: string) => {
  return useQuery({
    queryKey: ['objective-mastery', childId, objectiveId],
    queryFn: async (): Promise<ObjectiveMasteryProgress | null> => {
      if (!childId || !objectiveId) return null;

      // Get the objective with its success criteria
      const { data: objective, error: objError } = await supabase
        .from('objectives')
        .select('*, success_criteria(*)')
        .eq('id', objectiveId)
        .single();

      if (objError) throw objError;
      if (!objective) return null;

      const typedObjective = objective as ObjectiveWithSuccessCriteria;

      // Get mastery data for all success criteria of this objective
      const { data: masteryData, error: masteryError } = await supabase
        .from('student_mastery')
        .select('*')
        .eq('child_id', childId)
        .in(
          'success_criterion_id',
          typedObjective.success_criteria.map((sc) => sc.id)
        );

      if (masteryError) throw masteryError;

      const masteryMap = new Map(
        (masteryData || []).map((m) => [m.success_criterion_id, m])
      );

      const successCriteriaMastery = typedObjective.success_criteria.map((sc) => {
        const mastery = masteryMap.get(sc.id);
        return {
          id: sc.id,
          text: sc.text,
          status: (mastery?.status || 'not_started') as 'not_started' | 'in_progress' | 'mastered',
          mastery_score: mastery?.mastery_score || null,
          attempts_count: mastery?.attempts_count || 0,
          last_attempt_at: mastery?.last_attempt_at || null,
        };
      });

      const masteredCount = successCriteriaMastery.filter(
        (sc) => sc.status === 'mastered'
      ).length;
      const inProgressCount = successCriteriaMastery.filter(
        (sc) => sc.status === 'in_progress'
      ).length;

      return {
        objective_id: typedObjective.id,
        objective_text: typedObjective.text,
        total_criteria: typedObjective.success_criteria.length,
        mastered_criteria: masteredCount,
        in_progress_criteria: inProgressCount,
        mastery_percentage:
          typedObjective.success_criteria.length > 0
            ? (masteredCount / typedObjective.success_criteria.length) * 100
            : 0,
        success_criteria: successCriteriaMastery,
      };
    },
    enabled: !!childId && !!objectiveId,
  });
};

// Fetch task attempts for a child
export const useTaskAttempts = (childId?: string, filters?: {
  taskId?: string;
  successCriterionId?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['task-attempts', childId, filters],
    queryFn: async () => {
      if (!childId) return [];

      let query = supabase
        .from('curriculum_task_attempts')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false });

      if (filters?.taskId) {
        query = query.eq('task_id', filters.taskId);
      }
      if (filters?.successCriterionId) {
        query = query.eq('success_criterion_id', filters.successCriterionId);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CurriculumTaskAttempt[];
    },
    enabled: !!childId,
  });
};

// Fetch lesson sessions for a child
export const useLessonSessions = (childId?: string, lessonId?: string) => {
  return useQuery({
    queryKey: ['lesson-sessions', childId, lessonId],
    queryFn: async () => {
      if (!childId) return [];

      let query = supabase
        .from('lesson_sessions')
        .select('*')
        .eq('child_id', childId)
        .order('started_at', { ascending: false });

      if (lessonId) {
        query = query.eq('lesson_id', lessonId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LessonSession[];
    },
    enabled: !!childId,
  });
};

// Get mastery statistics for a child
export const useMasteryStats = (childId?: string) => {
  return useQuery({
    queryKey: ['mastery-stats', childId],
    queryFn: async (): Promise<MasteryStats> => {
      if (!childId) {
        return {
          total_criteria: 0,
          mastered_criteria: 0,
          in_progress_criteria: 0,
          not_started_criteria: 0,
          overall_mastery_percentage: 0,
          total_attempts: 0,
          recent_sessions: 0,
        };
      }

      // Get all mastery records
      const { data: masteryData, error: masteryError } = await supabase
        .from('student_mastery')
        .select('*')
        .eq('child_id', childId);

      if (masteryError) throw masteryError;

      // Get recent sessions (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('lesson_sessions')
        .select('id')
        .eq('child_id', childId)
        .gte('started_at', sevenDaysAgo.toISOString());

      if (sessionsError) throw sessionsError;

      const mastered = masteryData?.filter((m) => m.status === 'mastered').length || 0;
      const inProgress = masteryData?.filter((m) => m.status === 'in_progress').length || 0;
      const notStarted = masteryData?.filter((m) => m.status === 'not_started').length || 0;
      const total = masteryData?.length || 0;
      const totalAttempts =
        masteryData?.reduce((sum, m) => sum + (m.attempts_count || 0), 0) || 0;

      return {
        total_criteria: total,
        mastered_criteria: mastered,
        in_progress_criteria: inProgress,
        not_started_criteria: notStarted,
        overall_mastery_percentage: total > 0 ? (mastered / total) * 100 : 0,
        total_attempts: totalAttempts,
        recent_sessions: sessionsData?.length || 0,
      };
    },
    enabled: !!childId,
  });
};

// Update mastery status
export const useUpdateMastery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      child_id: string;
      success_criterion_id: string;
      status: 'not_started' | 'in_progress' | 'mastered';
      mastery_score?: number;
    }) => {
      const { error } = await supabase
        .from('student_mastery')
        .upsert(
          {
            child_id: data.child_id,
            success_criterion_id: data.success_criterion_id,
            status: data.status,
            mastery_score: data.mastery_score,
            last_attempt_at: new Date().toISOString(),
            ...(data.status === 'mastered' && { mastered_at: new Date().toISOString() }),
          },
          { onConflict: 'child_id,success_criterion_id' }
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-mastery', variables.child_id] });
      queryClient.invalidateQueries({ queryKey: ['mastery-stats', variables.child_id] });
    },
  });
};

// Record a task attempt
export const useRecordTaskAttempt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      child_id: string;
      task_id: string;
      success_criterion_id?: string;
      objective_id?: string;
      is_correct: boolean;
      answer_data?: Record<string, any>;
      time_spent_seconds?: number;
    }) => {
      const { error } = await supabase
        .from('curriculum_task_attempts')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-attempts', variables.child_id] });
    },
  });
};

// Create/update lesson session
export const useUpdateLessonSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id?: string;
      child_id: string;
      lesson_id: string;
      objective_ids?: string[];
      success_criterion_ids?: string[];
      duration_minutes?: number;
      completion_percentage?: number;
      completed_at?: string;
      notes?: string;
    }) => {
      if (data.id) {
        // Update existing session
        const { error } = await supabase
          .from('lesson_sessions')
          .update({
            duration_minutes: data.duration_minutes,
            completion_percentage: data.completion_percentage,
            completed_at: data.completed_at,
            notes: data.notes,
          })
          .eq('id', data.id);

        if (error) throw error;
      } else {
        // Create new session
        const { error } = await supabase.from('lesson_sessions').insert({
          child_id: data.child_id,
          lesson_id: data.lesson_id,
          objective_ids: data.objective_ids,
          success_criterion_ids: data.success_criterion_ids,
          duration_minutes: data.duration_minutes,
          completion_percentage: data.completion_percentage,
          completed_at: data.completed_at,
          notes: data.notes,
        });

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-sessions', variables.child_id] });
      queryClient.invalidateQueries({ queryKey: ['mastery-stats', variables.child_id] });
    },
  });
};
