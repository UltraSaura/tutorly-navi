import { supabase } from '@/integrations/supabase/client';
import type { LearningAttemptResult } from '@/types/learning-attempt';
import type { MasteryUpdateResult } from '@/types/mastery-v2';
import type { SpacedReviewState } from '@/types/spaced-review';
import { advanceSpacedReview, initialSpacedReviewState } from './spacedReviewService';

type ReviewRow = {
  student_id: string;
  subject_id: string;
  concept_id: string;
  objective_id: string | null;
  stage: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  last_result_correct: boolean | null;
};

function fromRow(row: ReviewRow): SpacedReviewState {
  return {
    studentId: row.student_id,
    subjectId: row.subject_id,
    conceptId: row.concept_id,
    objectiveId: row.objective_id ?? undefined,
    stage: row.stage,
    nextReviewAt: row.next_review_at,
    lastReviewedAt: row.last_reviewed_at ?? undefined,
    lastResultCorrect: row.last_result_correct ?? undefined,
  };
}

function toRow(state: SpacedReviewState) {
  return {
    student_id: state.studentId,
    subject_id: state.subjectId,
    concept_id: state.conceptId,
    objective_id: state.objectiveId ?? null,
    stage: state.stage,
    next_review_at: state.nextReviewAt,
    last_reviewed_at: state.lastReviewedAt ?? null,
    last_result_correct: state.lastResultCorrect ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchSpacedReviewStates(studentId: string): Promise<SpacedReviewState[]> {
  const { data, error } = await (supabase as any)
    .from('spaced_review_states')
    .select('student_id, subject_id, concept_id, objective_id, stage, next_review_at, last_reviewed_at, last_result_correct')
    .eq('student_id', studentId)
    .order('next_review_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ReviewRow[]).map(fromRow);
}

export async function seedSpacedReviewFromMastery(update: MasteryUpdateResult): Promise<void> {
  const state = update.state;
  if ((state.currentMasteryLevel ?? 0) < 3 || state.currentScore < 70) return;

  const initial = initialSpacedReviewState({
    studentId: state.studentId,
    subjectId: state.subjectId,
    conceptId: state.conceptId,
    objectiveId: state.objectiveId,
    masteredAt: state.lastSuccessfulAt ?? state.updatedAt,
  });

  const { data: existing } = await (supabase as any)
    .from('spaced_review_states')
    .select('id')
    .eq('student_id', state.studentId)
    .eq('subject_id', state.subjectId)
    .eq('concept_id', state.conceptId)
    .maybeSingle();

  if (existing?.id) return;
  const { error } = await (supabase as any).from('spaced_review_states').insert(toRow(initial));
  if (error && import.meta.env.DEV) console.warn('[SpacedReview] unable to seed review state', error);
}

export async function recordSpacedReviewAttempt(attempt: LearningAttemptResult, reviewedAt = new Date().toISOString()): Promise<void> {
  const { data, error } = await (supabase as any)
    .from('spaced_review_states')
    .select('student_id, subject_id, concept_id, objective_id, stage, next_review_at, last_reviewed_at, last_result_correct')
    .eq('student_id', attempt.studentId)
    .eq('subject_id', attempt.subjectId)
    .eq('concept_id', attempt.conceptId)
    .maybeSingle();
  if (error || !data) return;

  const next = advanceSpacedReview(fromRow(data as ReviewRow), attempt.correct, reviewedAt);
  const { error: updateError } = await (supabase as any)
    .from('spaced_review_states')
    .update(toRow(next))
    .eq('student_id', attempt.studentId)
    .eq('subject_id', attempt.subjectId)
    .eq('concept_id', attempt.conceptId);
  if (updateError && import.meta.env.DEV) console.warn('[SpacedReview] unable to advance review state', updateError);
}
