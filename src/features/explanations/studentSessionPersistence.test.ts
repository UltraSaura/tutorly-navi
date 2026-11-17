import { describe, expect, it } from 'vitest';
import { createInteractiveTutorSession, requestTutorHint, submitTutorResponse } from './interactiveTutorSession';
import { restoreStudentSession, saveStudentSession } from './studentSessionPersistence';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('student session persistence', () => {
  it('restores the active step, attempts, hints, answer draft and tab after leaving Practice', () => {
    const storage = memoryStorage();
    let session = createInteractiveTutorSession();
    session = submitTutorResponse(session, 'J’ajoute 10 unités en haut et 1 dizaine en bas');
    session = requestTutorHint(session);
    saveStudentSession(storage, 'session:student:subtraction', session, '10', 'animation');

    const restored = restoreStudentSession(storage, 'session:student:subtraction');
    expect(restored?.session.step).toBe(session.step);
    expect(restored?.session.question).toBe(session.question);
    expect(restored?.session.attempts).toEqual([{ step: 0, prerequisite: false, answer: 'J’ajoute 10 unités en haut et 1 dizaine en bas', isCorrect: true }]);
    expect(restored?.session.hintLevelsByStep).toEqual(session.hintLevelsByStep);
    expect(restored?.answer).toBe('10');
    expect(restored?.tab).toBe('animation');
  });

  it('ignores missing, malformed or unsupported saved state', () => {
    const storage = memoryStorage();
    storage.setItem('bad', '{');
    storage.setItem('unsupported', JSON.stringify({ version: 2 }));
    expect(restoreStudentSession(storage, 'missing')).toBeNull();
    expect(restoreStudentSession(storage, 'bad')).toBeNull();
    expect(restoreStudentSession(storage, 'unsupported')).toBeNull();
  });
});
