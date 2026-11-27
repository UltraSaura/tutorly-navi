import { describe, expect, it } from 'vitest';
import { InteractiveActivitySchema, type InteractiveActivitySpec } from './activityContract';
import { coordinateGuidedQuestion, fractionGuidedQuestion } from './pedagogicalQuestions';

const fraction: Extract<InteractiveActivitySpec, { kind: 'fraction-bar' }> = {
  schemaVersion: 1, id: 'cm2-fractions-001', kind: 'fraction-bar', schoolLevel: 'CM2',
  title: 'Additionner des fractions', prompt: 'Additionner',
  left: { n: 3, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4,
};
const coordinate: Extract<InteractiveActivitySpec, { kind: 'coordinate-plane' }> = {
  schemaVersion: 1, id: '4e-coordinates-001', kind: 'coordinate-plane', schoolLevel: '4e',
  title: 'Placer un point', prompt: 'Placer', target: { x: 2, y: 3 },
};
describe('explicit pedagogical questions', () => {
  it('asks CM2 one concrete question per fraction step without revealing the answer', () => {
    const first = fractionGuidedQuestion(fraction, 0);
    const second = fractionGuidedQuestion(fraction, 1);
    expect(first.step).toContain('Étape 1 sur 2');
    expect(first.context).toContain('morceaux de même taille');
    expect(first.question).toContain('combien de quarts');
    expect(first.question).toContain('barre du bas');
    expect(first.answerHelp).toContain('sans écrire de fraction');
    expect(second.step).toContain('Étape 2 sur 2');
    expect(second.context).toContain('3 quarts');
    expect(second.context).toContain('en montre 2');
    expect(second.question).toContain('en tout');
    expect(second.question).not.toContain('5 quarts');
  });
  it('uses mathematical vocabulary for older levels and remains explicit', () => {
    const older = fractionGuidedQuestion({ ...fraction, schoolLevel: '4e' }, 0);
    expect(older.context).toContain('même dénominateur');
    expect(older.question).toMatch(/combien de quarts/i);
    const young = coordinateGuidedQuestion({ ...coordinate, schoolLevel: 'CM2' });
    expect(young.context).toContain('2 cases vers la droite');
    expect(young.context).toContain('3 cases vers le haut');
    expect(young.question).toContain('(2 ; 3)');
    const olderCoordinate = coordinateGuidedQuestion(coordinate);
    expect(olderCoordinate.context).toContain('abscisse');
    expect(olderCoordinate.context).toContain('ordonnée');
    expect(olderCoordinate.question).toContain('(2 ; 3)');
    expect(olderCoordinate.answerHelp).toContain('Valider la position');
  });
  it('explains directions for negative coordinates and handles the origin', () => {
    const negative = coordinateGuidedQuestion({ ...coordinate, target: { x: -2, y: -3 } });
    expect(negative.context).toContain('vers la gauche');
    expect(negative.context).toContain('vers le bas');
    const zero = coordinateGuidedQuestion({ ...coordinate, target: { x: 0, y: 0 } });
    expect(zero.context).toContain('ligne verticale du centre');
    expect(zero.context).toContain('ligne horizontale du centre');
  });
  it('validates grade metadata without requiring it on existing lesson blocks', () => {
    expect(InteractiveActivitySchema.safeParse(fraction).success).toBe(true);
    expect(InteractiveActivitySchema.safeParse({ ...fraction, schoolLevel: 'CM2' }).success).toBe(true);
    expect(InteractiveActivitySchema.safeParse({ ...fraction, schoolLevel: undefined }).success).toBe(true);
    expect(InteractiveActivitySchema.safeParse({ ...fraction, schoolLevel: 'unknown' }).success).toBe(false);
  });
  it('keeps generated questions consistent when fractions change', () => {
    const spec = { ...fraction, left: { n: 1, d: 6 }, right: { n: 1, d: 3 }, targetDenominator: 6 };
    const step = fractionGuidedQuestion(spec, 1);
    expect(step.context).toContain('1 sixième');
    expect(step.context).toContain('en montre 2');
    expect(step.question).toContain('sixièmes');
  });
});
