import { describe, expect, it } from 'vitest';
import { canAuthorCoordinates, isCoordinateCurriculumAllowed } from './exerciseCurriculum';
import { SCHOOL_LEVELS } from '@/domain/schoolLevels';
import { createCoordinateExercise } from './coordinatePlane';
import { evaluateQuestion, isQuizAnswerComplete, scoreQuestionWithPenalty } from '@/utils/quizEvaluation';

const topic = { countryCode: 'fr', levelCode: '5eme', subject: 'Mathématiques', category: 'Espace et géométrie' };
describe('coordinate curriculum and bank organization', () => {
  it('allows only the explicitly mapped French school level', () => {
    for (const level of SCHOOL_LEVELS) expect(isCoordinateCurriculumAllowed('fr', level.code)).toBe(level.code === '5eme');
    expect(isCoordinateCurriculumAllowed('FR', '5ème')).toBe(true);
    for (const country of ['us', 'gb', '', null, undefined]) expect(isCoordinateCurriculumAllowed(country, '5eme')).toBe(false);
  });
  it('fails closed on missing metadata, wrong subject, category, country and mixed-level assignments', () => {
    expect(canAuthorCoordinates({ schoolLevels: ['5eme'], topics: [topic] })).toBe(true);
    expect(canAuthorCoordinates(undefined)).toBe(false);
    expect(canAuthorCoordinates({ topics: [] })).toBe(false);
    for (const changed of [{ levelCode: 'cm2' }, { countryCode: 'be' }, { subject: 'Histoire' }, { category: 'Calcul mental' }]) {
      expect(canAuthorCoordinates({ topics: [{ ...topic, ...changed }] })).toBe(false);
    }
    expect(canAuthorCoordinates({ schoolLevels: ['5eme', 'cm2'], topics: [topic] })).toBe(false);
    expect(canAuthorCoordinates({ subject: 'Français', topics: [topic] })).toBe(false);
    expect(canAuthorCoordinates({ topics: [topic, { ...topic, levelCode: null }] })).toBe(false);
  });
  it('uses existing quiz grading and retry penalties without marking an opened exercise complete', () => {
    const exercise = createCoordinateExercise('read', () => 0.4);
    const answer = { ...exercise.target, attempts: 2, supported: true, complete: true };
    expect(evaluateQuestion(exercise, answer)).toBe(true);
    expect(isQuizAnswerComplete(exercise, answer)).toBe(true);
    expect(isQuizAnswerComplete(exercise, { ...answer, complete: false })).toBe(false);
    expect(evaluateQuestion(exercise, { ...answer, x: '' })).toBe(false);
    expect(scoreQuestionWithPenalty(exercise.points!, answer.attempts, true).awardedPoints).toBe(0.5);
  });
});
