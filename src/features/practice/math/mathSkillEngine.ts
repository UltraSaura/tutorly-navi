import type { MathSkillActivityConfiguration, MathSkillKind } from './mathSkillDefinitions';

export interface MathSkillQuestion {
  id: string;
  prompt: string;
  answer: number;
  choices?: number[];
  factKey?: string;
  familyKey?: string;
}

export interface MathFactMasteryEvidence {
  key: string;
  score: number;
}

export type PracticeEvidenceBand = 'weak' | 'developing' | 'mastered';

export interface PracticeMixItem<T> {
  item: T;
  band: PracticeEvidenceBand;
}

function seededNumber(seed: string): number {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function rotate<T>(items: T[], seed: string): T[] {
  if (items.length < 2) return [...items];
  const offset = seededNumber(seed) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

export function factFamilyKey(a: number, b: number): string {
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  return `fact:${low}x${high}`;
}

export function multiplicationFactKey(a: number, b: number): string {
  return `mul:${a}x${b}`;
}

export function divisionFactKey(dividend: number, divisor: number): string {
  return `div:${dividend}/${divisor}`;
}

export function classifyPracticeEvidence(score: number): PracticeEvidenceBand {
  if (score < 50) return 'weak';
  if (score < 80) return 'developing';
  return 'mastered';
}

export function selectPracticeMix<T extends { key: string; score: number }>(
  items: T[],
  count: number,
  seed = 'tutorly-practice',
): PracticeMixItem<T>[] {
  if (items.length === 0 || count <= 0) return [];
  const groups: Record<PracticeEvidenceBand, T[]> = {
    weak: rotate(items.filter((item) => classifyPracticeEvidence(item.score) === 'weak'), `${seed}:weak`),
    developing: rotate(items.filter((item) => classifyPracticeEvidence(item.score) === 'developing'), `${seed}:developing`),
    mastered: rotate(items.filter((item) => classifyPracticeEvidence(item.score) === 'mastered'), `${seed}:mastered`),
  };
  const targets: Record<PracticeEvidenceBand, number> = {
    weak: Math.round(count * 0.6),
    developing: Math.round(count * 0.25),
    mastered: 0,
  };
  targets.mastered = Math.max(0, count - targets.weak - targets.developing);

  const result: PracticeMixItem<T>[] = [];
  (['weak', 'developing', 'mastered'] as PracticeEvidenceBand[]).forEach((band) => {
    for (let i = 0; i < targets[band] && groups[band].length > 0; i += 1) {
      result.push({ item: groups[band][i % groups[band].length], band });
    }
  });

  const fallback = rotate(items, `${seed}:fallback`);
  let cursor = 0;
  while (result.length < count && fallback.length > 0) {
    const item = fallback[cursor % fallback.length];
    result.push({ item, band: classifyPracticeEvidence(item.score) });
    cursor += 1;
  }
  return result.slice(0, count);
}

function choices(answer: number, seed: string): number[] {
  const candidates = [answer, answer + 1, Math.max(0, answer - 1), answer + 2];
  return rotate(Array.from(new Set(candidates)), seed).slice(0, 4);
}

function configNumber(config: MathSkillActivityConfiguration, key: keyof MathSkillActivityConfiguration, fallback: number): number {
  const value = config[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function generateMathSkillQuestions(
  config: MathSkillActivityConfiguration,
  seed = 'tutorly-math',
): MathSkillQuestion[] {
  const count = Math.max(1, config.itemCount);
  const tables = config.tables?.length ? config.tables : [2, 5, 10];
  const questions: MathSkillQuestion[] = [];

  for (let i = 0; i < count; i += 1) {
    const table = tables[(seededNumber(`${seed}:table:${i}`)) % tables.length];
    const factor = 2 + (seededNumber(`${seed}:factor:${i}`) % 9);
    const id = `${config.skill}-${i + 1}`;

    if (config.skill === 'times_tables') {
      const answer = table * factor;
      questions.push({ id, prompt: `${table} × ${factor} = ?`, answer, factKey: multiplicationFactKey(table, factor), familyKey: factFamilyKey(table, factor) });
    } else if (config.skill === 'division_facts') {
      const dividend = table * factor;
      questions.push({ id, prompt: `${dividend} ÷ ${table} = ?`, answer: factor, factKey: divisionFactKey(dividend, table), familyKey: factFamilyKey(table, factor) });
    } else if (config.skill === 'number_bonds') {
      const target = configNumber(config, 'target', 10);
      const first = 1 + (seededNumber(`${seed}:bond:${i}`) % Math.max(1, target - 1));
      questions.push({ id, prompt: `${first} + ? = ${target}`, answer: target - first });
    } else if (config.skill === 'number_line') {
      const min = configNumber(config, 'min', 0);
      const max = Math.max(min + 4, configNumber(config, 'max', 20));
      const answer = min + (seededNumber(`${seed}:line:${i}`) % (max - min + 1));
      questions.push({ id, prompt: `Find ${answer} on the number line from ${min} to ${max}.`, answer, choices: choices(answer, `${seed}:line-choices:${i}`) });
    } else if (config.skill === 'fraction_match') {
      const denominatorMax = Math.max(2, configNumber(config, 'denominatorMax', 8));
      const denominator = 2 + (seededNumber(`${seed}:den:${i}`) % (denominatorMax - 1));
      const numerator = 1 + (seededNumber(`${seed}:num:${i}`) % Math.max(1, denominator - 1));
      const scale = 2;
      const answer = numerator * scale;
      questions.push({ id, prompt: `${numerator}/${denominator} = ?/${denominator * scale}`, answer, choices: choices(answer, `${seed}:fraction:${i}`) });
    } else {
      const min = configNumber(config, 'min', 1);
      const max = Math.max(min + 10, configNumber(config, 'max', 100));
      const a = min + (seededNumber(`${seed}:a:${i}`) % Math.max(1, max - min));
      const b = 1 + (seededNumber(`${seed}:b:${i}`) % Math.max(2, Math.floor(max / 5)));
      const useSubtraction = i % 2 === 1 && a > b;
      questions.push({ id, prompt: useSubtraction ? `${a} − ${b} = ?` : `${a} + ${b} = ?`, answer: useSubtraction ? a - b : a + b });
    }
  }

  return questions;
}

export function isMathSkillKind(value: unknown): value is MathSkillKind {
  return ['times_tables', 'division_facts', 'mental_math', 'number_bonds', 'number_line', 'fraction_match'].includes(String(value));
}
