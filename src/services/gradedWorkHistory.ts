import { supabase } from '@/integrations/supabase/client';
import type { Exercise, ProblemSubmission } from '@/types/chat';

export interface GradedWorkInput {
  exerciseContent: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
  subjectId?: string | null;
  topicId?: string | null;
  timeSpentSeconds?: number | null;
}

export interface SavedGradedWorkResult {
  exerciseHistoryId: string;
  attemptNumber: number;
}

function cleanText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function rowPrompt(problem: ProblemSubmission, row: ProblemSubmission['sections'][number]['rows'][number]): string {
  const parts = [
    problem.title,
    problem.sharedContext,
    row.relatedContext,
    row.prompt,
  ]
    .map(cleanText)
    .filter(Boolean);

  return parts.join('\n\n');
}

function rowAnswer(row: ProblemSubmission['sections'][number]['rows'][number]): string | null {
  return cleanText(
    row.studentAnswer ||
      row.selectedOption ||
      row.evaluation?.selectedAnswer ||
      null
  );
}

function rowCorrectness(row: ProblemSubmission['sections'][number]['rows'][number]): boolean | null {
  if (typeof row.evaluation?.isCorrect === 'boolean') return row.evaluation.isCorrect;
  if (row.evaluation?.status === 'correct') return true;
  if (row.evaluation?.status === 'incorrect') return false;
  return null;
}

export function buildGradedWorkFromExercise(exercise: Exercise): GradedWorkInput | null {
  const exerciseContent = cleanText(exercise.question);
  const userAnswer = cleanText(exercise.userAnswer);
  if (!exerciseContent || !userAnswer) return null;

  return {
    exerciseContent,
    userAnswer,
    isCorrect: typeof exercise.isCorrect === 'boolean' ? exercise.isCorrect : null,
    subjectId: exercise.subjectId || null,
    topicId: exercise.topicId || null,
  };
}

export function buildGradedWorkFromGroupedProblem(problem: ProblemSubmission): GradedWorkInput[] {
  if (problem.status !== 'evaluated') return [];

  return problem.sections.flatMap(section =>
    section.rows.flatMap(row => {
      if (!row.selected || row.doNotGrade || !row.evaluation) return [];

      const exerciseContent = cleanText(rowPrompt(problem, row));
      const userAnswer = rowAnswer(row);
      if (!exerciseContent || !userAnswer) return [];

      return [{
        exerciseContent,
        userAnswer,
        isCorrect: rowCorrectness(row),
        subjectId: null,
        topicId: null,
      }];
    })
  );
}

export async function saveGradedWorkToHistory(input: GradedWorkInput): Promise<SavedGradedWorkResult | null> {
  const exerciseContent = cleanText(input.exerciseContent);
  const userAnswer = cleanText(input.userAnswer);
  if (!exerciseContent || !userAnswer) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    if (import.meta.env.DEV) {
      console.debug('[GradedWorkHistory] No authenticated user, skipping save:', userError?.message);
    }
    return null;
  }

  const { data: existing, error: checkError } = await supabase
    .from('exercise_history')
    .select('id, attempts_count')
    .eq('user_id', userData.user.id)
    .eq('exercise_content', exerciseContent)
    .maybeSingle();

  if (checkError) throw checkError;

  const attemptNumber = (existing?.attempts_count || 0) + 1;
  let exerciseHistoryId = existing?.id;

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('exercise_history')
      .update({
        user_answer: userAnswer,
        is_correct: input.isCorrect,
        subject_id: input.subjectId || null,
        topic_id: input.topicId || null,
        attempts_count: attemptNumber,
        time_spent_seconds: input.timeSpentSeconds || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id')
      .single();

    if (updateError) throw updateError;
    exerciseHistoryId = updated.id;
  } else {
    const { data: created, error: createError } = await supabase
      .from('exercise_history')
      .insert({
        user_id: userData.user.id,
        exercise_content: exerciseContent,
        user_answer: userAnswer,
        is_correct: input.isCorrect,
        subject_id: input.subjectId || null,
        topic_id: input.topicId || null,
        attempts_count: attemptNumber,
        time_spent_seconds: input.timeSpentSeconds || null,
      })
      .select('id')
      .single();

    if (createError) throw createError;
    exerciseHistoryId = created.id;
  }

  const { error: attemptError } = await supabase
    .from('exercise_attempts')
    .insert({
      exercise_history_id: exerciseHistoryId,
      user_answer: userAnswer,
      is_correct: input.isCorrect,
      attempt_number: attemptNumber,
      time_spent_seconds: input.timeSpentSeconds || null,
    });

  if (attemptError) throw attemptError;

  return {
    exerciseHistoryId,
    attemptNumber,
  };
}

export async function saveGradedWorksToHistory(inputs: GradedWorkInput[]): Promise<SavedGradedWorkResult[]> {
  const results: SavedGradedWorkResult[] = [];

  for (const input of inputs) {
    const result = await saveGradedWorkToHistory(input);
    if (result) results.push(result);
  }

  return results;
}
