import { describe, expect, it } from 'vitest';
import {
  coordinateParts, createCoordinateExercise, createCoordinateTransfer, isCoordinateAnswerCorrect,
  isCoordinateExercise, validateCoordinateExercise, type CoordinateAnswer, type CoordinatePlaneExercise,
} from './coordinatePlane';

const exercise: CoordinatePlaneExercise = {
  id: 'coordinate-source', kind: 'coordinate-plane', mode: 'read', maxX: 6, maxY: 6,
  target: { x: 5, y: 4 }, prompt: 'Lis le point.', curriculumCountry: 'fr', schoolLevels: ['5eme'], points: 1,
};
const answer: CoordinateAnswer = { x: 5, y: 4, attempts: 1, supported: false, complete: true };

describe('coordinate exercise contract', () => {
  it('accepts the origin, axes, outer bounds and normalized cinquième labels', () => {
    for (const target of [{ x: 0, y: 0 }, { x: 0, y: 4 }, { x: 5, y: 0 }, { x: 6, y: 6 }]) {
      for (const level of ['5eme', '5ème', '5e', 'Cinquième']) expect(validateCoordinateExercise({ ...exercise, target, schoolLevels: [level] })).toEqual([]);
    }
    expect(validateCoordinateExercise({ ...exercise, maxX: 1, maxY: 8, target: { x: 1, y: 8 }, points: 0 })).toEqual([]);
  });

  it('rejects invalid configurations without coercion or a hidden grade expansion', () => {
    for (const value of [null, [], {}, { ...exercise, id: '' }, { ...exercise, prompt: ' ' }, { ...exercise, kind: 'other' }, { ...exercise, mode: 'drag' }, { ...exercise, maxX: 0 }, { ...exercise, maxY: 9 }, { ...exercise, maxX: '6' }, { ...exercise, maxY: 3.5 }, { ...exercise, maxX: Infinity }, { ...exercise, target: null }, { ...exercise, target: { x: -1, y: 4 } }, { ...exercise, target: { x: 5, y: 7 } }, { ...exercise, target: { x: '5', y: 4 } }, { ...exercise, target: { x: 5, y: NaN } }, { ...exercise, points: -1 }, { ...exercise, points: 101 }, { ...exercise, points: '1' }, { ...exercise, curriculumCountry: 'en' }, { ...exercise, schoolLevels: [] }, { ...exercise, schoolLevels: ['cm2'] }, { ...exercise, schoolLevels: ['5eme', '4eme'] }, { ...exercise, schoolLevels: [5] }]) {
      expect(isCoordinateExercise(value), JSON.stringify(value)).toBe(false);
    }
  });
});

describe('coordinate response evidence', () => {
  it('checks each coordinate independently and preserves a correct horizontal coordinate', () => {
    expect(coordinateParts(exercise, { x: 5, y: 3 })).toEqual({ x: true, y: false });
    expect(coordinateParts(exercise, { x: 3, y: 4 })).toEqual({ x: false, y: true });
    expect(coordinateParts(exercise, {})).toEqual({ x: false, y: false });
  });

  it('requires finite integer numbers and does not coerce blank or textual coordinates', () => {
    for (const x of [null, undefined, '', '5', NaN, Infinity, 5.1, -1, 7, true]) expect(coordinateParts(exercise, { x, y: 4 }).x).toBe(false);
    const origin = { ...exercise, target: { x: 0, y: 0 } };
    expect(coordinateParts(origin, { x: 0, y: 0 })).toEqual({ x: true, y: true });
    expect(coordinateParts(origin, { x: '', y: null })).toEqual({ x: false, y: false });
  });

  it('requires a submitted completed attempt, not merely a selected correct point', () => {
    expect(isCoordinateAnswerCorrect(exercise, answer)).toBe(true);
    expect(isCoordinateAnswerCorrect(exercise, { ...answer, supported: true, attempts: 2 })).toBe(true);
    for (const value of [null, {}, { ...answer, complete: false }, { ...answer, complete: 'true' }, { ...answer, attempts: 0 }, { ...answer, attempts: -1 }, { ...answer, attempts: '1' }, { ...answer, attempts: 1.5 }, { ...answer, supported: undefined }, { ...answer, x: '5' }, { ...answer, y: 3 }]) expect(isCoordinateAnswerCorrect(exercise, value)).toBe(false);
  });
});

describe('generated coordinate tasks', () => {
  it.each(['read', 'plot'] as const)('generates valid distinct-coordinate %s tasks with unique IDs', mode => {
    const ids = new Set<string>();
    for (const randomValue of [0, 0.1, 0.5, 0.999999, 1, -1, NaN]) {
      const value = createCoordinateExercise(mode, () => randomValue);
      expect(validateCoordinateExercise(value)).toEqual([]);
      expect(value.target.x).not.toBe(value.target.y);
      expect(value.mode).toBe(mode);
      expect(value.maxX).toBe(6);
      expect(value.maxY).toBe(6);
      expect(value.schoolLevels).toEqual(['5eme']);
      expect(value.points).toBe(1);
      ids.add(value.id);
      if (mode === 'read') expect(value.prompt).not.toMatch(/\d/);
      else expect(value.prompt).toContain(`(${value.target.x} ; ${value.target.y})`);
    }
    expect(ids.size).toBe(7);
  });

  it('creates a fresh deterministic transfer across every bounded target, including origin and edges', () => {
    for (let maxX = 1; maxX <= 8; maxX++) for (let maxY = 1; maxY <= 8; maxY++) {
      for (let x = 0; x <= maxX; x++) for (let y = 0; y <= maxY; y++) {
        const source = { ...exercise, maxX, maxY, target: { x, y } };
        const transfer = createCoordinateTransfer(source);
        expect(validateCoordinateExercise(transfer)).toEqual([]);
        expect(transfer.id).not.toBe(source.id);
        expect(transfer.target.x).not.toBe(x);
        expect(transfer.target.y).not.toBe(y);
        expect(transfer.mode).toBe(source.mode);
        expect(transfer.maxX).toBe(maxX);
        expect(transfer.maxY).toBe(maxY);
        expect(transfer.schoolLevels).toEqual(source.schoolLevels);
        expect(transfer.schoolLevels).not.toBe(source.schoolLevels);
        expect(createCoordinateTransfer(source)).toEqual(transfer);
        expect(source.target).toEqual({ x, y });
      }
    }
  });

  it('updates plotting instructions and rejects malformed transfer sources', () => {
    const source = { ...exercise, mode: 'plot' as const, target: { x: 6, y: 6 }, prompt: 'Old prompt: (6 ; 6)' };
    const transfer = createCoordinateTransfer(source);
    expect(transfer.target).toEqual({ x: 0, y: 0 });
    expect(transfer.prompt).toContain('(0 ; 0)');
    expect(transfer.prompt).not.toContain('(6 ; 6)');
    expect(() => createCoordinateTransfer({ ...source, maxX: 0 })).toThrow();
  });
});
