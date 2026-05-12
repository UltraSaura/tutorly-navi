import { useQuery } from '@tanstack/react-query';
import {
  fetchExamExercises,
  fetchExamFilterOptions,
  fetchExamPaperDetail,
  fetchExamPapers,
  fetchExerciseProgramLinks,
  fetchTrainingItems,
  fetchTrainingItemSubjectCounts,
  type ExamPaperFilters,
  type TrainingItemFilters,
} from '@/services/examImportService';

export function useExamPapers(filters: ExamPaperFilters) {
  return useQuery({
    queryKey: ['exam-import', 'papers', filters],
    queryFn: () => fetchExamPapers(filters),
  });
}

export function useExamPaperDetail(paperId: string | null) {
  return useQuery({
    queryKey: ['exam-import', 'paper-detail', paperId],
    queryFn: () => fetchExamPaperDetail(paperId ?? ''),
    enabled: paperId !== null,
  });
}

export function useExamExercises(paperId: string | null) {
  return useQuery({
    queryKey: ['exam-import', 'exercises', paperId],
    queryFn: () => fetchExamExercises(paperId ?? ''),
    enabled: paperId !== null,
  });
}

export function useExerciseProgramLinks(exerciseIds: string[]) {
  return useQuery({
    queryKey: ['exam-import', 'program-links', exerciseIds],
    queryFn: () => fetchExerciseProgramLinks(exerciseIds),
    enabled: exerciseIds.length > 0,
  });
}

export function useExamFilterOptions() {
  return useQuery({
    queryKey: ['exam-import', 'filter-options'],
    queryFn: fetchExamFilterOptions,
  });
}

export function useTrainingItems(filters: TrainingItemFilters) {
  return useQuery({
    queryKey: ['exam-import', 'training-items', filters],
    queryFn: () => fetchTrainingItems(filters),
  });
}

export function useTrainingItemSubjectCounts(level?: string) {
  return useQuery({
    queryKey: ['exam-import', 'training-item-subject-counts', level],
    queryFn: () => fetchTrainingItemSubjectCounts(level),
  });
}
