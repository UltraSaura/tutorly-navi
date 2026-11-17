import type { InteractiveTutorSession } from './interactiveTutorSession';

export type StudentSessionTab = 'teacher' | 'animation';
export type PersistedStudentSession = { version: 1; session: InteractiveTutorSession; answer: string; tab: StudentSessionTab };
type SessionStorageReader = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function restoreStudentSession(storage: SessionStorageReader, storageKey?: string): PersistedStudentSession | null {
  if (!storageKey) return null;
  try {
    const value = JSON.parse(storage.getItem(storageKey) ?? 'null') as PersistedStudentSession | null;
    return value?.version === 1
      && Number.isInteger(value.session?.step)
      && typeof value.session?.question === 'string'
      && Array.isArray(value.session?.attempts)
      && Array.isArray(value.session?.completedSteps)
      && typeof value.answer === 'string'
      && (value.tab === 'teacher' || value.tab === 'animation')
      ? value
      : null;
  } catch { return null; }
}

export function saveStudentSession(storage: SessionStorageReader, storageKey: string | undefined, session: InteractiveTutorSession, answer: string, tab: StudentSessionTab) {
  if (!storageKey) return;
  try { storage.setItem(storageKey, JSON.stringify({ version: 1, session, answer, tab } satisfies PersistedStudentSession)); } catch { /* storage can be unavailable; the in-memory session remains usable */ }
}
