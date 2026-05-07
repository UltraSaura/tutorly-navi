import { supabase } from '@/integrations/supabase/client';

const examSupabase = supabase as any;

export type ExamSeries = 'generale' | 'professionnelle' | null;
export type ExamVariant = 'standard' | 'arial16' | 'arial20' | 'arial24' | 'braille_integral' | 'braille_abrege';
export type ExamParsingStatus = 'parsed' | 'partial' | 'failed';
export type ProgramLinkStatus = 'proposed' | 'accepted' | 'rejected';

export interface ExamPaperFilters {
  exam?: string;
  session_year?: number;
  /** Single discipline or OR-list (multiple exam disciplines pour une même matière) */
  discipline?: string | string[];
  series?: string;
  source_name?: string;
  parsing_status?: string;
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
    .select('id, import_id, exam, session_year, discipline, series, variant, source_name, parsing_status, title, pdf_url, source_url, exercise_ids')
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
