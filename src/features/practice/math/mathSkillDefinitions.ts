import type { PedagogicalAgeBand } from '@/config/ageConfig';
import type { SkillActivityDefinition, SkillActivityEngine } from '@/types/skill-activity';

export type MathSkillKind =
  | 'times_tables'
  | 'division_facts'
  | 'mental_math'
  | 'number_bonds'
  | 'number_line'
  | 'fraction_match';

export interface MathSkillActivityConfiguration {
  skill: MathSkillKind;
  itemCount: number;
  timerSeconds?: number;
  tables?: number[];
  target?: number;
  min?: number;
  max?: number;
  denominatorMax?: number;
}

const AGE_BANDS: PedagogicalAgeBand[] = ['early_primary', 'upper_primary', 'middle_school', 'high_school'];

function definition(
  ageBand: PedagogicalAgeBand,
  skill: MathSkillKind,
  engine: SkillActivityEngine,
  conceptId: string,
  title: string,
  description: string,
  difficulty: number,
  configuration: MathSkillActivityConfiguration,
): SkillActivityDefinition {
  return {
    id: `math-${skill}-${ageBand}`,
    subjectId: 'mathematiques',
    conceptId,
    engine,
    ageBand,
    masteryLevels: [1, 2, 3, 4],
    difficulty,
    title,
    description,
    estimatedMinutes: ageBand === 'early_primary' ? 3 : 5,
    contentVersion: 'phase-10-v1',
    tags: ['math-skills-lab', skill],
    configuration: { ...configuration, skill },
  };
}

function definitionsForBand(ageBand: PedagogicalAgeBand): SkillActivityDefinition[] {
  const early = ageBand === 'early_primary';
  const upper = ageBand === 'upper_primary';
  const timerSeconds = early ? undefined : upper ? 60 : 45;
  const itemCount = early ? 6 : upper ? 10 : 12;

  return [
    definition(ageBand, 'times_tables', 'fact_sprint', 'math:multiplication_facts', 'Times Tables Sprint', 'Build multiplication fact fluency.', 2, {
      skill: 'times_tables', itemCount, timerSeconds, tables: early ? [2, 5, 10] : upper ? [2, 3, 4, 5, 6, 7, 8, 9, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    }),
    definition(ageBand, 'division_facts', 'fact_sprint', 'math:division_facts', 'Division Fact Sprint', 'Use multiplication fact families to divide quickly.', 2, {
      skill: 'division_facts', itemCount, timerSeconds, tables: early ? [2, 5, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10],
    }),
    definition(ageBand, 'mental_math', 'mental_chain', 'math:mental_calculation', 'Mental Math Rush', 'Practice efficient mental calculation strategies.', 3, {
      skill: 'mental_math', itemCount, timerSeconds, min: 1, max: early ? 20 : upper ? 100 : 500,
    }),
    definition(ageBand, 'number_bonds', 'missing_number', 'math:number_bonds', 'Number Bonds', 'Find the missing part that completes the target number.', 1, {
      skill: 'number_bonds', itemCount, target: early ? 10 : upper ? 100 : 1000,
    }),
    definition(ageBand, 'number_line', 'number_line', 'math:number_line', 'Number Line Challenge', 'Locate numbers and reason about distance on a number line.', 2, {
      skill: 'number_line', itemCount, min: 0, max: early ? 20 : upper ? 100 : 1000,
    }),
    definition(ageBand, 'fraction_match', 'match_pairs', 'math:fractions', 'Fraction Match', 'Match equivalent fractions and visual quantities.', 3, {
      skill: 'fraction_match', itemCount: early ? 4 : 8, denominatorMax: early ? 4 : upper ? 10 : 12,
    }),
  ];
}

export const MATH_SKILLS_LAB_ACTIVITIES: readonly SkillActivityDefinition[] = AGE_BANDS.flatMap(definitionsForBand);

export function getMathSkillsLabActivities(ageBand?: PedagogicalAgeBand): SkillActivityDefinition[] {
  return MATH_SKILLS_LAB_ACTIVITIES.filter((activity) => !ageBand || activity.ageBand === ageBand);
}
