import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ExerciseHistoryRecord, ExerciseHistoryWithAttempts } from '@/types/exercise-history';
import { toast } from 'sonner';

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
          attempts:exercise_attempts(*),
          explanation:exercise_explanations_cache(*)
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
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('No authenticated user');
        return null;
      }

      // Check if this exercise already exists for this user
      const { data: existing, error: checkError } = await supabase
        .from('exercise_history')
        .select('id, attempts_count')
        .eq('user_id', user.user.id)
        .eq('exercise_content', exerciseContent)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing exercise:', checkError);
        return null;
      }

      let exerciseHistoryId: string;

      if (existing) {
        // Update existing exercise
        const { data: updated, error: updateError } = await supabase
          .from('exercise_history')
          .update({
            user_answer: userAnswer,
            is_correct: isCorrect,
            attempts_count: existing.attempts_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select('id')
          .single();

        if (updateError) {
          console.error('Error updating exercise history:', updateError);
          return null;
        }

        exerciseHistoryId = updated.id;
      } else {
        // Create new exercise history record
        const { data: created, error: createError } = await supabase
          .from('exercise_history')
          .insert({
            user_id: user.user.id,
            exercise_content: exerciseContent,
            user_answer: userAnswer,
            is_correct: isCorrect,
            subject_id: subjectId,
            attempts_count: 1
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating exercise history:', createError);
          return null;
        }

        exerciseHistoryId = created.id;
      }

      // Create attempt record
      const attemptNumber = existing ? existing.attempts_count + 1 : 1;
      const { error: attemptError } = await supabase
        .from('exercise_attempts')
        .insert({
          exercise_history_id: exerciseHistoryId,
          user_answer: userAnswer,
          is_correct: isCorrect,
          attempt_number: attemptNumber
        });

      if (attemptError) {
        console.error('Error creating attempt record:', attemptError);
        toast.error('Failed to save attempt record');
        return null;
      }

      // Log successful save
      console.log('✅ Exercise saved successfully:', {
        userId: user.user.id,
        exerciseHistoryId,
        attemptNumber,
        isCorrect,
        subjectId
      });

      toast.success('Exercise saved to history');
      
      return exerciseHistoryId;
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