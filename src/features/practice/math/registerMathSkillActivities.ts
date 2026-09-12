import { registerPracticeActivityRenderer } from '../activityRegistry';
import { MathSkillActivityRenderer } from './MathSkillActivityRenderer';

let registered = false;

export function registerMathSkillActivityRenderers(): void {
  if (registered) return;
  ['fact_sprint', 'mental_chain', 'missing_number', 'number_line', 'match_pairs'].forEach((engine) => {
    registerPracticeActivityRenderer(engine as 'fact_sprint' | 'mental_chain' | 'missing_number' | 'number_line' | 'match_pairs', MathSkillActivityRenderer);
  });
  registered = true;
}
