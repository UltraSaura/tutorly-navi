// Age configuration for the lesson card player.
// Controls font sizes, visual sizes, celebration intensity, and vocabulary mode.
// Derived from the student's curriculum_level_code stored in Supabase.

export type AgeGroup = 'young' | 'mid' | 'old';

export interface AgeConfig {
  group: AgeGroup;
  titleSize: number;
  bodySize: number;
  visualSize: number;
  exampleCount: number;
  showMascot: boolean;
  celebration: 'big' | 'medium' | 'subtle';
}

export const AGE_CONFIGS: Record<AgeGroup, AgeConfig> = {
  young: {
    group: 'young',
    titleSize: 20,
    bodySize: 16,
    visualSize: 110,
    exampleCount: 2,
    showMascot: true,
    celebration: 'big',
  },
  mid: {
    group: 'mid',
    titleSize: 17,
    bodySize: 14,
    visualSize: 95,
    exampleCount: 3,
    showMascot: false,
    celebration: 'medium',
  },
  old: {
    group: 'old',
    titleSize: 15,
    bodySize: 13,
    visualSize: 82,
    exampleCount: 3,
    showMascot: false,
    celebration: 'subtle',
  },
};

const YOUNG_LEVELS = ['cp', 'ce1'];
const OLD_LEVELS = ['6eme', '5eme', '4eme', '3eme', 'seconde', 'premiere', 'terminale'];

export function getAgeGroup(levelCode: string): AgeGroup {
  const code = levelCode.toLowerCase();
  if (YOUNG_LEVELS.includes(code)) return 'young';
  if (OLD_LEVELS.includes(code)) return 'old';
  return 'mid';
}

export function getAgeConfig(levelCode?: string | null): AgeConfig {
  return AGE_CONFIGS[getAgeGroup(levelCode ?? 'cm1')];
}
