import { supabase } from '@/integrations/supabase/client';

const corrSupabase = supabase as any;

export interface ExamQuestionCorrection {
  id: string;
  exam_paper_id: string | null;
  exercise_id: string | null;
  question_id: string;
  correct_answer: string | null;
  explanation_steps: string[];
  source: string;
  created_at: string;
}

export type NewCorrection = Omit<ExamQuestionCorrection, 'id' | 'created_at'>;

/** Admin-only — RLS blocks non-admin reads at the DB level. */
export async function getCorrectionsForPaper(paperId: string): Promise<ExamQuestionCorrection[]> {
  const { data, error } = await corrSupabase
    .from('exam_question_corrections')
    .select('*')
    .eq('exam_paper_id', paperId)
    .order('question_id', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ExamQuestionCorrection[];
}

/** Admin-only — insert or skip on duplicate (exam_paper_id, question_id). */
export async function upsertCorrection(correction: NewCorrection): Promise<void> {
  const { error } = await corrSupabase
    .from('exam_question_corrections')
    .insert(correction);

  if (error && error.code !== '23505') throw error;
}

/** Admin-only. */
export async function deleteCorrection(id: string): Promise<void> {
  const { error } = await corrSupabase
    .from('exam_question_corrections')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
