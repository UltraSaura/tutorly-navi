import type { ComponentType } from 'react';
import type { LearningAttemptResult } from '@/types/learning-attempt';
import type { SkillActivityDefinition, SkillActivityEngine } from '@/types/skill-activity';

export interface PracticeActivityRendererProps {
  activity: SkillActivityDefinition;
  onAttempt: (attempt: LearningAttemptResult) => void;
  onComplete: () => void;
}

type PracticeActivityRenderer = ComponentType<PracticeActivityRendererProps>;

const renderers = new Map<SkillActivityEngine, PracticeActivityRenderer>();

export function registerPracticeActivityRenderer(
  engine: SkillActivityEngine,
  renderer: PracticeActivityRenderer,
): void {
  renderers.set(engine, renderer);
}

export function getPracticeActivityRenderer(
  engine: SkillActivityEngine,
): PracticeActivityRenderer | undefined {
  return renderers.get(engine);
}

export function hasPracticeActivityRenderer(engine: SkillActivityEngine): boolean {
  return renderers.has(engine);
}

export function getRegisteredPracticeActivityEngines(): SkillActivityEngine[] {
  return Array.from(renderers.keys()).sort();
}

/** Test-only helper; production content should register renderers during module setup. */
export function clearPracticeActivityRenderersForTests(): void {
  renderers.clear();
}
