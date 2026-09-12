import type { SkillActivityEngine } from '@/types/skill-activity';
import { registerPracticeActivityRenderer } from '../activityRegistry';
import { StructuredPracticeRenderer } from './StructuredPracticeRenderer';

const ENGINES: SkillActivityEngine[] = [
  'sentence_builder',
  'multiple_choice_challenge',
  'error_detective',
  'sort_classify',
  'sequence',
  'timeline',
  'map_interaction',
];

let registered = false;

export function registerCrossSubjectActivityRenderers(): void {
  if (registered) return;
  ENGINES.forEach((engine) => registerPracticeActivityRenderer(engine, StructuredPracticeRenderer));
  registered = true;
}
