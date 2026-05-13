import { supabase } from '@/integrations/supabase/client';
import type { TrainingAnswerType, TrainingQuestion } from '@/lib/trainingGuidance';
import { getSubjectSlugAliases } from '@/utils/examSubjectMapping';

const examSupabase = supabase as any;

export type ExamSeries = 'generale' | 'professionnelle' | null;
export type ExamVariant = 'standard' | 'arial16' | 'arial20' | 'arial24' | 'braille_integral' | 'braille_abrege';
export type ExamParsingStatus = 'parsed' | 'partial' | 'failed';
export type ProgramLinkStatus = 'proposed' | 'accepted' | 'rejected';
export type TrainingItemType =
  | 'multiple_choice'
  | 'short_answer'
  | 'numeric'
  | 'free_response'
  | 'guided_problem'
  | 'document_question'
  | 'proof'
  | 'calculation';
export type TrainingItemDifficulty = 'easy' | 'medium' | 'hard';
export type TrainingItemStatus = 'draft' | 'reviewed' | 'published' | 'rejected';

export interface ExamPaperFilters {
  exam?: string;
  session_year?: number;
  /** Single discipline or OR-list (multiple exam disciplines pour une même matière) */
  discipline?: string | string[];
  series?: string;
  source_name?: string;
  parsing_status?: string;
  level?: string;
}

export interface TrainingItemFilters {
  subject_slug?: string;
  paper_id?: string;
  level?: string;
  item_type?: TrainingItemType;
  difficulty?: TrainingItemDifficulty;
  status?: TrainingItemStatus;
  source_year?: number;
  limit?: number;
}

export interface ExamPaperListItem {
  id: string;
  import_id: string;
  exam: string;
  session_year: number;
  discipline: string;
  series: ExamSeries;
  variant: ExamVariant;
  source_name: string;
  parsing_status: ExamParsingStatus;
  title: string | null;
  level: string | null;
  pdf_url: string;
  source_url: string;
  raw_text?: string;
  exercise_count: number;
}

export interface ExamPaperDetail extends ExamPaperListItem {
  source_id: string | null;
  fetched_at: string;
  location: string;
  pdf_hash: string;
  raw_text: string;
  exercise_ids: string[];
}

export interface ExamExercise {
  id: string;
  import_id: string;
  paper_id: string;
  exercise_number: number | null;
  title: string | null;
  raw_text: string;
  parsing_status: ExamParsingStatus;
  parsed_content?: unknown | null;
  parsing_confidence?: 'high' | 'medium' | 'low' | null;
  correction?: string | null;
  points?: number | null;
  tags?: string[] | null;
}

export interface TrainingDocument {
  id?: string;
  type?: 'text' | 'table' | 'image' | 'graph';
  label?: string;
  caption?: string;
  content?: string;
  table?: {
    headers: string[];
    rows: string[][];
  };
  local_path?: string;
  storage_path?: string;
  public_url?: string | null;
  alt?: string;
  fallback?: boolean;
  source?: {
    page?: number;
  };
  render_mode?: 'image_first' | 'table_first' | 'image_only' | 'table_only';
}

export interface ExamTrainingItem {
  id: string;
  source_exercise_id: string | null;
  paper_id: string | null;
  exam: string;
  subject_slug: string;
  level: string;
  skill_tags: string[];
  skill?: string | null;
  curriculum_objective_ids: string[] | null;
  item_type: TrainingItemType;
  prompt: string;
  context: string | null;
  documents: TrainingDocument[];
  choices: unknown[] | null;
  expected_answer: unknown | null;
  solution: string | null;
  hints: unknown[] | null;
  questions: TrainingQuestion[];
  difficulty: TrainingItemDifficulty;
  exam_style: string | null;
  source_year: number | null;
  source_label: string | null;
  metadata: Record<string, unknown>;
  status: TrainingItemStatus;
  created_at: string;
  updated_at: string;
}

export interface TrainingItemAnswerInput {
  item_id: string;
  question_id: string;
  answer_text: string;
  hint_level: number;
  guidance_feedback: string | null;
  feedback?: string | null;
  is_correct: boolean | null;
}

export interface ExerciseProgramLink {
  id: string;
  exercise_id: string;
  exercise_import_id: string;
  program_entry_id: string;
  program_entry_type: 'objective' | 'success_criterion' | 'topic' | 'unknown';
  confidence: number;
  rationale: string;
  status?: ProgramLinkStatus | null;
}

export async function fetchExamPapers(filters: ExamPaperFilters = {}): Promise<ExamPaperListItem[]> {
  let query = examSupabase
    .from('exam_papers')
    .select('id, import_id, exam, level, session_year, discipline, series, variant, source_name, parsing_status, title, pdf_url, source_url, exercise_ids')
    .order('session_year', { ascending: false })
    .order('discipline', { ascending: true });

  if (filters.exam) query = query.eq('exam', filters.exam);
  if (filters.session_year !== undefined) query = query.eq('session_year', filters.session_year);
  if (filters.discipline) {
    const d = filters.discipline;
    if (Array.isArray(d)) {
      const list = d.filter((x): x is string => typeof x === 'string' && x.length > 0);
      if (list.length === 1) query = query.eq('discipline', list[0]);
      else if (list.length > 1) query = query.in('discipline', list);
    } else {
      query = query.eq('discipline', d);
    }
  }
  if (filters.series) query = filters.series === 'none' ? query.is('series', null) : query.eq('series', filters.series);
  if (filters.source_name) query = query.eq('source_name', filters.source_name);
  if (filters.parsing_status) query = query.eq('parsing_status', filters.parsing_status);
  if (filters.level) query = query.eq('level', filters.level);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as any[]).map((paper) => ({
    ...paper,
    exercise_count: Array.isArray(paper.exercise_ids) ? paper.exercise_ids.length : 0,
  })) as ExamPaperListItem[];
}

export async function fetchExamPaperDetail(paperId: string): Promise<ExamPaperDetail | null> {
  const { data, error } = await examSupabase
    .from('exam_papers')
    .select('*')
    .eq('id', paperId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const paper = data as any;
  return {
    ...paper,
    exercise_count: Array.isArray(paper.exercise_ids) ? paper.exercise_ids.length : 0,
  } as ExamPaperDetail;
}

export async function fetchExamExercises(paperId: string): Promise<ExamExercise[]> {
  const { data, error } = await examSupabase
    .from('exam_exercises')
    .select('*')
    .eq('paper_id', paperId)
    .order('exercise_number', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ExamExercise[];
}

export async function fetchTrainingItems(filters: TrainingItemFilters = {}): Promise<ExamTrainingItem[]> {
  let query = examSupabase
    .from('exam_training_items')
    .select(
      [
        'id',
        'source_exercise_id',
        'paper_id',
        'exam',
        'subject_slug',
        'level',
        'skill_tags',
        'skill',
        'curriculum_objective_ids',
        'item_type',
        'prompt',
        'context',
        'documents',
        'choices',
        // Never expose `expected_answer` to the frontend.
        'solution',
        'hints',
        'questions',
        'difficulty',
        'exam_style',
        'source_year',
        'source_label',
        'metadata',
        'status',
        'created_at',
        'updated_at',
      ].join(', ')
    )
    .order('source_year', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  query = query.eq('status', filters.status ?? 'published');
  if (filters.subject_slug) {
    const aliases = getSubjectSlugAliases(filters.subject_slug);
    if (aliases.length === 1) {
      query = query.eq('subject_slug', aliases[0]);
    } else {
      query = query.in('subject_slug', aliases);
    }
  }
  if (filters.paper_id) query = query.eq('paper_id', filters.paper_id);
  if (filters.level) query = query.eq('level', filters.level);
  if (filters.item_type) query = query.eq('item_type', filters.item_type);
  if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
  if (filters.source_year !== undefined) query = query.eq('source_year', filters.source_year);
  if (filters.limit !== undefined) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ExamTrainingItem[];
}

export async function fetchTrainingItemSubjectCounts(level?: string): Promise<Record<string, number>> {
  let query = examSupabase
    .from('exam_training_items')
    .select('subject_slug')
    .eq('status', 'published');

  if (level) query = query.eq('level', level);

  const { data, error } = await query;

  if (error) throw error;

  return ((data ?? []) as Array<{ subject_slug: string | null }>).reduce<Record<string, number>>((acc, row) => {
    if (!row.subject_slug) return acc;
    acc[row.subject_slug] = (acc[row.subject_slug] ?? 0) + 1;
    return acc;
  }, {});
}

export async function saveTrainingItemAnswer(input: TrainingItemAnswerInput): Promise<void> {
  const { error } = await examSupabase.from('training_item_answers').insert({
    item_id: input.item_id,
    question_id: input.question_id,
    answer_text: input.answer_text,
    hint_level: input.hint_level,
    guidance_feedback: input.guidance_feedback,
    feedback: input.feedback ?? input.guidance_feedback,
    is_correct: input.is_correct,
    submitted_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function validateTrainingAnswer(input: {
  item_id: string;
  question_id: string;
  user_answer: string;
}): Promise<{ is_correct: boolean | null; feedback: string | null }> {
  const { data, error } = await (examSupabase as any).functions.invoke('validate-training-answer', {
    body: input,
  });
  if (error) throw error;
  return (data ?? {}) as { is_correct: boolean | null; feedback: string | null };
}

export function trainingAnswerTypeFromItemType(itemType: TrainingItemType): TrainingAnswerType {
  if (itemType === 'numeric' || itemType === 'calculation') return 'numeric';
  if (itemType === 'multiple_choice') return 'multiple_choice';
  if (itemType === 'free_response' || itemType === 'guided_problem' || itemType === 'proof') return 'free_response';
  return 'short_answer';
}

export async function fetchExerciseProgramLinks(exerciseIds: string[]): Promise<ExerciseProgramLink[]> {
  if (exerciseIds.length === 0) return [];

  const { data, error } = await examSupabase
    .from('exam_exercise_program_links')
    .select('*')
    .in('exercise_id', exerciseIds)
    .order('confidence', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ExerciseProgramLink[];
}

export async function fetchExamFilterOptions(): Promise<{
  years: number[];
  disciplines: string[];
  series: string[];
  sources: string[];
  parsingStatuses: string[];
}> {
  const { data, error } = await examSupabase
    .from('exam_papers')
    .select('session_year, discipline, series, source_name, parsing_status')
    .order('session_year', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as any[];
  return {
    years: unique(rows.map((row) => row.session_year).filter((value): value is number => typeof value === 'number')).sort((a, b) => b - a),
    disciplines: unique(rows.map((row) => row.discipline).filter(isString)).sort(),
    series: unique(rows.map((row) => row.series ?? 'none')).sort(),
    sources: unique(rows.map((row) => row.source_name).filter(isString)).sort(),
    parsingStatuses: unique(rows.map((row) => row.parsing_status).filter(isString)).sort(),
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
