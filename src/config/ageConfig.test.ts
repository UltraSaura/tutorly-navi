import { describe, expect, it } from 'vitest';
import {
  getPedagogicalAgeBand,
  getAgeLearningConfig,
  isPedagogicalUnder11,
  PEDAGOGICAL_AGE_CONFIGS,
  type PedagogicalAgeBand,
} from './ageConfig';
import {
  getAgeGroup,
  getAgeConfig,
  AGE_CONFIGS,
} from '@/components/learning/lesson/ageConfig';

describe('Canonical Age Configuration System (Phase 1)', () => {
  describe('Pedagogical Band Mapping (French Curriculum Levels)', () => {
    it('maps CP and CE1 to early_primary', () => {
      expect(getPedagogicalAgeBand('cp')).toBe('early_primary');
      expect(getPedagogicalAgeBand('ce1')).toBe('early_primary');
      expect(getPedagogicalAgeBand('CP')).toBe('early_primary');
      expect(getPedagogicalAgeBand('CE1')).toBe('early_primary');
      expect(getPedagogicalAgeBand('fr:cp')).toBe('early_primary');
      expect(getPedagogicalAgeBand('fr:ce1')).toBe('early_primary');
    });

    it('maps CE2, CM1, CM2 to upper_primary', () => {
      expect(getPedagogicalAgeBand('ce2')).toBe('upper_primary');
      expect(getPedagogicalAgeBand('cm1')).toBe('upper_primary');
      expect(getPedagogicalAgeBand('cm2')).toBe('upper_primary');
      expect(getPedagogicalAgeBand('CE2')).toBe('upper_primary');
      expect(getPedagogicalAgeBand('CM1')).toBe('upper_primary');
      expect(getPedagogicalAgeBand('CM2')).toBe('upper_primary');
      expect(getPedagogicalAgeBand('fr:cm1')).toBe('upper_primary');
    });

    it('maps 6e, 5e, 4e, 3e to middle_school', () => {
      expect(getPedagogicalAgeBand('6eme')).toBe('middle_school');
      expect(getPedagogicalAgeBand('5eme')).toBe('middle_school');
      expect(getPedagogicalAgeBand('4eme')).toBe('middle_school');
      expect(getPedagogicalAgeBand('3eme')).toBe('middle_school');
      expect(getPedagogicalAgeBand('6ème')).toBe('middle_school');
      expect(getPedagogicalAgeBand('5ème')).toBe('middle_school');
      expect(getPedagogicalAgeBand('4ème')).toBe('middle_school');
      expect(getPedagogicalAgeBand('3ème')).toBe('middle_school');
      expect(getPedagogicalAgeBand('6e')).toBe('middle_school');
      expect(getPedagogicalAgeBand('3e')).toBe('middle_school');
      expect(getPedagogicalAgeBand('troisieme')).toBe('middle_school');
      expect(getPedagogicalAgeBand('fr:3eme')).toBe('middle_school');
    });

    it('maps 2nde, 1re, Terminale to high_school', () => {
      expect(getPedagogicalAgeBand('2nde')).toBe('high_school');
      expect(getPedagogicalAgeBand('1ere')).toBe('high_school');
      expect(getPedagogicalAgeBand('terminale')).toBe('high_school');
      expect(getPedagogicalAgeBand('seconde')).toBe('high_school');
      expect(getPedagogicalAgeBand('premiere')).toBe('high_school');
      expect(getPedagogicalAgeBand('term')).toBe('high_school');
      expect(getPedagogicalAgeBand('1re')).toBe('high_school');
      expect(getPedagogicalAgeBand('fr:terminale')).toBe('high_school');
    });

    it('handles null, undefined, empty, or unknown levels with safe fallback to upper_primary', () => {
      expect(getPedagogicalAgeBand(null)).toBe('upper_primary');
      expect(getPedagogicalAgeBand(undefined)).toBe('upper_primary');
      expect(getPedagogicalAgeBand('')).toBe('upper_primary');
      expect(getPedagogicalAgeBand('unknown_level_123')).toBe('upper_primary');
    });
  });

  describe('Pedagogical Learning Configuration Contracts', () => {
    it('provides early_primary pedagogical properties (Jeux, no timer pressure, very high visual/manipulative)', () => {
      const config = getAgeLearningConfig('cp');
      expect(config.band).toBe('early_primary');
      expect(config.practiceLabel).toBe('Jeux');
      expect(config.practiceLabelKey).toBe('pedagogy.practiceLabel.early_primary');
      expect(config.instructionComplexity).toBe('very_simple');
      expect(config.visualSupport).toBe('very_high');
      expect(config.scaffoldLevel).toBe('very_high');
      expect(config.interactionStyle).toBe('playful');
      expect(config.timerPressure).toBe('none');
      expect(config.manipulativePriority).toBe('very_high');
      expect(config.explanationDensity).toBe('very_short');
      expect(config.preferredActivityDurationMinutes).toEqual({ min: 2, max: 5 });
      expect(config.showMascot).toBe(true);
      expect(config.celebration).toBe('big');
    });

    it('provides upper_primary pedagogical properties (Défis, low timer pressure, high visual/manipulative)', () => {
      const config = getAgeLearningConfig('cm1');
      expect(config.band).toBe('upper_primary');
      expect(config.practiceLabel).toBe('Défis');
      expect(config.practiceLabelKey).toBe('pedagogy.practiceLabel.upper_primary');
      expect(config.instructionComplexity).toBe('simple');
      expect(config.visualSupport).toBe('high');
      expect(config.scaffoldLevel).toBe('high');
      expect(config.interactionStyle).toBe('challenge');
      expect(config.timerPressure).toBe('low');
      expect(config.manipulativePriority).toBe('high');
      expect(config.explanationDensity).toBe('short');
      expect(config.preferredActivityDurationMinutes).toEqual({ min: 3, max: 8 });
      expect(config.showMascot).toBe(false);
      expect(config.celebration).toBe('medium');
    });

    it('provides middle_school pedagogical properties (Entraînement, normal timer, medium visual/scaffolding)', () => {
      const config = getAgeLearningConfig('4eme');
      expect(config.band).toBe('middle_school');
      expect(config.practiceLabel).toBe('Entraînement');
      expect(config.practiceLabelKey).toBe('pedagogy.practiceLabel.middle_school');
      expect(config.instructionComplexity).toBe('standard');
      expect(config.visualSupport).toBe('medium');
      expect(config.scaffoldLevel).toBe('medium');
      expect(config.interactionStyle).toBe('training');
      expect(config.timerPressure).toBe('normal');
      expect(config.manipulativePriority).toBe('medium');
      expect(config.explanationDensity).toBe('standard');
      expect(config.preferredActivityDurationMinutes).toEqual({ min: 5, max: 12 });
      expect(config.showMascot).toBe(false);
      expect(config.celebration).toBe('subtle');
    });

    it('provides high_school pedagogical properties (S’entraîner, concise explanations, low scaffolding)', () => {
      const config = getAgeLearningConfig('terminale');
      expect(config.band).toBe('high_school');
      expect(config.practiceLabel).toBe("S'entraîner");
      expect(config.practiceLabelKey).toBe('pedagogy.practiceLabel.high_school');
      expect(config.instructionComplexity).toBe('advanced');
      expect(config.visualSupport).toBe('low');
      expect(config.scaffoldLevel).toBe('low');
      expect(config.interactionStyle).toBe('academic');
      expect(config.timerPressure).toBe('normal');
      expect(config.manipulativePriority).toBe('optional');
      expect(config.explanationDensity).toBe('concise');
      expect(config.preferredActivityDurationMinutes).toEqual({ min: 8, max: 20 });
      expect(config.showMascot).toBe(false);
      expect(config.celebration).toBe('subtle');
    });
  });

  describe('isPedagogicalUnder11 Helper', () => {
    it('returns true for early_primary and upper_primary', () => {
      expect(isPedagogicalUnder11('cp')).toBe(true);
      expect(isPedagogicalUnder11('ce1')).toBe(true);
      expect(isPedagogicalUnder11('ce2')).toBe(true);
      expect(isPedagogicalUnder11('cm1')).toBe(true);
      expect(isPedagogicalUnder11('cm2')).toBe(true);
    });

    it('returns false for middle_school and high_school', () => {
      expect(isPedagogicalUnder11('6eme')).toBe(false);
      expect(isPedagogicalUnder11('5eme')).toBe(false);
      expect(isPedagogicalUnder11('4eme')).toBe(false);
      expect(isPedagogicalUnder11('3eme')).toBe(false);
      expect(isPedagogicalUnder11('2nde')).toBe(false);
      expect(isPedagogicalUnder11('1ere')).toBe(false);
      expect(isPedagogicalUnder11('terminale')).toBe(false);
    });
  });

  describe('Backward Compatibility with Legacy Lesson ageConfig', () => {
    it('maps legacy getAgeGroup correctly through the canonical bands', () => {
      expect(getAgeGroup('cp')).toBe('young');
      expect(getAgeGroup('ce1')).toBe('young');
      expect(getAgeGroup('ce2')).toBe('mid');
      expect(getAgeGroup('cm1')).toBe('mid');
      expect(getAgeGroup('cm2')).toBe('mid');
      expect(getAgeGroup('6eme')).toBe('old');
      expect(getAgeGroup('3eme')).toBe('old');
      expect(getAgeGroup('terminale')).toBe('old');
    });

    it('maps legacy getAgeConfig with exact metrics', () => {
      const youngConfig = getAgeConfig('cp');
      expect(youngConfig.group).toBe('young');
      expect(youngConfig.visualSize).toBe(110);
      expect(youngConfig.titleSize).toBe(20);
      expect(youngConfig.bodySize).toBe(16);
      expect(youngConfig.exampleCount).toBe(2);
      expect(youngConfig.showMascot).toBe(true);
      expect(youngConfig.celebration).toBe('big');

      const midConfig = getAgeConfig('cm1');
      expect(midConfig.group).toBe('mid');
      expect(midConfig.visualSize).toBe(95);
      expect(midConfig.titleSize).toBe(17);
      expect(midConfig.bodySize).toBe(14);
      expect(midConfig.exampleCount).toBe(3);
      expect(midConfig.showMascot).toBe(false);
      expect(midConfig.celebration).toBe('medium');

      const oldConfig = getAgeConfig('3eme');
      expect(oldConfig.group).toBe('old');
      expect(oldConfig.visualSize).toBe(82);
      expect(oldConfig.titleSize).toBe(15);
      expect(oldConfig.bodySize).toBe(13);
      expect(oldConfig.exampleCount).toBe(3);
      expect(oldConfig.showMascot).toBe(false);
      expect(oldConfig.celebration).toBe('subtle');
    });

    it('retains constant AGE_CONFIGS record for legacy consumers', () => {
      expect(AGE_CONFIGS.young).toBeDefined();
      expect(AGE_CONFIGS.mid).toBeDefined();
      expect(AGE_CONFIGS.old).toBeDefined();
    });
  });
});
