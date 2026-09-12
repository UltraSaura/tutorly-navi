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
  const { data, error } = await supabase
    .from('spaced_review_states')
    .select('student_id, subject_id, concept_id, objective_id, stage, next_review_at, last_reviewed_at, last_result_correct')
    .eq('student_id', studentId)
    .order('next_review_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ReviewRow[]).map(fromRow);
}

export async function seedSpacedReviewConcept(input: {
  studentId: string;
  subjectId: string;
  conceptId: string;
  objectiveId?: string;
  masteredAt?: string;
}): Promise<void> {
  const conceptId = input.conceptId.trim();
  if (!input.studentId || !input.subjectId || !conceptId) return;

  const { data: existing, error: lookupError } = await supabase
    .from('spaced_review_states')
    .select('id')
    .eq('student_id', input.studentId)
    .eq('subject_id', input.subjectId)
    .eq('concept_id', conceptId)
    .maybeSingle();
  if (lookupError || existing?.id) return;

  const initial = initialSpacedReviewState({
    studentId: input.studentId,
    subjectId: input.subjectId,
    conceptId,
    objectiveId: input.objectiveId,
    masteredAt: input.masteredAt ?? new Date().toISOString(),
  });
  const { error } = await supabase.from('spaced_review_states').insert(toRow(initial));
  if (error && import.meta.env.DEV) console.warn('[SpacedReview] unable to seed review state', error);
}

export async function seedSpacedReviewFromMastery(
  update: MasteryUpdateResult,
  reviewConceptId?: string,
): Promise<void> {
  const state = update.state;
  if ((state.currentMasteryLevel ?? 0) < 3 || state.currentScore < 70) return;
  await seedSpacedReviewConcept({
    studentId: state.studentId,
    subjectId: state.subjectId,
    conceptId: reviewConceptId?.trim() || state.conceptId,
    objectiveId: state.objectiveId,
    masteredAt: state.lastSuccessfulAt ?? state.updatedAt,
  });
}

export async function recordSpacedReviewAttempt(
  attempt: LearningAttemptResult,
  reviewConceptId: string,
  reviewedAt = new Date().toISOString(),
): Promise<void> {
  const conceptId = reviewConceptId.trim();
  if (!conceptId) return;
  const { data, error } = await supabase
    .from('spaced_review_states')
    .select('student_id, subject_id, concept_id, objective_id, stage, next_review_at, last_reviewed_at, last_result_correct')
    .eq('student_id', attempt.studentId)
    .eq('subject_id', attempt.subjectId)
    .eq('concept_id', conceptId)
    .maybeSingle();
  if (error || !data) return;

  const next = advanceSpacedReview(fromRow(data as ReviewRow), attempt.correct, reviewedAt);
  const { error: updateError } = await supabase
    .from('spaced_review_states')
    .update(toRow(next))
    .eq('student_id', attempt.studentId)
    .eq('subject_id', attempt.subjectId)
    .eq('concept_id', conceptId);
  if (updateError && import.meta.env.DEV) console.warn('[SpacedReview] unable to advance review state', updateError);
}
