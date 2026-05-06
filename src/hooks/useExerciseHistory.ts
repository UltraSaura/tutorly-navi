import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ExerciseHistoryRecord, ExerciseHistoryWithAttempts } from '@/types/exercise-history';
import { toast } from 'sonner';
import { saveGradedWorkToHistory } from '@/services/gradedWorkHistory';

interface UseExerciseHistoryOptions {
  limit?: number;
  subject?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export const useExerciseHistory = (options: UseExerciseHistoryOptions = {}) => {
  const [history, setHistory] = useState<ExerciseHistoryWithAttempts[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('exercise_history')
        .select(`
          *,
          attempts:exercise_attempts(
            *,
            explanation:exercise_explanations_cache(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.subject) {
        query = query.eq('subject_id', options.subject);
      }

      if (options.dateFrom) {
        query = query.gte('created_at', options.dateFrom.toISOString());
      }

      if (options.dateTo) {
        query = query.lte('created_at', options.dateTo.toISOString());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching exercise history:', fetchError);
        setError(fetchError.message);
        return;
      }

      setHistory(data || []);
    } catch (err) {
      console.error('Unexpected error fetching exercise history:', err);
      setError('Failed to fetch exercise history');
    } finally {
      setLoading(false);
    }
  };

  const saveExerciseToHistory = async (
    exerciseContent: string,
    userAnswer: string,
    isCorrect: boolean | null,
    subjectId: string | null = null
  ): Promise<string | null> => {
    try {
      const result = await saveGradedWorkToHistory({
        exerciseContent,
        userAnswer,
        isCorrect,
        subjectId,
      });

      if (!result) return null;

      // Log successful save
      console.log('✅ Exercise saved successfully:', {
        exerciseHistoryId: result.exerciseHistoryId,
        attemptNumber: result.attemptNumber,
        isCorrect,
        subjectId
      });

      toast.success('Exercise saved to history');
      
      return result.exerciseHistoryId;
    } catch (err) {
      console.error('Unexpected error saving exercise:', err);
      return null;
    }
  };

  const getStats = () => {
    const totalExercises = history.length;
    const correctExercises = history.filter(ex => ex.is_correct === true).length;
    const totalAttempts = history.reduce((sum, ex) => sum + ex.attempts_count, 0);
    const successRate = totalExercises > 0 ? (correctExercises / totalExercises) * 100 : 0;

    return {
      totalExercises,
      correctExercises,
      totalAttempts,
      successRate: Math.round(successRate)
    };
  };

  useEffect(() => {
    fetchHistory();
  }, [options.limit, options.subject, options.dateFrom, options.dateTo]);

  return {
    history,
    loading,
    error,
    fetchHistory,
    saveExerciseToHistory,
    stats: getStats()
  };
};
