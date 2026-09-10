// Age configuration for the lesson card player.
// Controls font sizes, visual sizes, celebration intensity, and vocabulary mode.
// Derived from the student's curriculum_level_code stored in Supabase.
//
// NOTE: Canonical pedagogical configuration is now in @/config/ageConfig.
// This module provides backward-compatible adapters for existing lesson player consumers.

import {
  getPedagogicalAgeBand,
  getAgeLearningConfig,
  type PedagogicalAgeBand,
} from '@/config/ageConfig';

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

function bandToLegacyGroup(band: PedagogicalAgeBand): AgeGroup {
  if (band === 'early_primary') return 'young';
  if (band === 'upper_primary') return 'mid';
  return 'old';
}

export function getAgeGroup(levelCode: string): AgeGroup {
  const band = getPedagogicalAgeBand(levelCode);
  return bandToLegacyGroup(band);
}

export function getAgeConfig(levelCode?: string | null): AgeConfig {
  const learningConfig = getAgeLearningConfig(levelCode);
  return {
    group: bandToLegacyGroup(learningConfig.band),
    titleSize: learningConfig.titleSize,
    bodySize: learningConfig.bodySize,
    visualSize: learningConfig.visualSize,
    exampleCount: learningConfig.exampleCount,
    showMascot: learningConfig.showMascot,
    celebration: learningConfig.celebration,
  };
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

