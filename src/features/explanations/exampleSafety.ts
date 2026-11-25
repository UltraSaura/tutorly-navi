import { containsOriginalExercise } from '@/utils/operationTypeDetector';
import type { TeachingSections } from './useTwoCardTeaching';

/** Shared boundary for fresh, cached and reused learner explanations. */
export function teachingRepeatsOriginal(source: string, value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
  const sections = value as Partial<TeachingSections>;
  if (sections.steps != null && !Array.isArray(sections.steps)) return true;
  const text = [sections.concept, sections.example, sections.method, sections.pitfall,
    sections.check, sections.practice, sections.currentExercise, sections.parentHelpHint, sections.correctAnswer,
    ...(sections.steps || []).flatMap(step => step && typeof step === 'object' ? [step.title, step.body] : [])];
  return text.some(value => typeof value === 'string' && containsOriginalExercise(source, value));
}

export function assertDifferentTeachingExample(source: string, sections: Partial<TeachingSections>): void {
  if (teachingRepeatsOriginal(source, sections)) {
    throw new Error('The explanation repeated your exercise. Please try again to get a different example.');
  }
}
