import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type ActiveFamilyProfile =
  | { kind: 'parent'; familyAccountId: string }
  | { kind: 'child'; familyAccountId: string; childId: string }
  | null;
export interface FamilyChild {
  id: string;
  learnerId: string;
  firstName: string | null;
  grade: string | null;
  avatarUrl: string | null;
  available: boolean;
}
export interface FamilySelection {
  profile: NonNullable<ActiveFamilyProfile>;
  user: User | null;
  token: string;
  expiresAt: string;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function normalizeFamilyChildren(payload: unknown): FamilyChild[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((value) => {
    if (!record(value) || typeof value.id !== 'string' || !value.id.trim() || typeof value.learnerId !== 'string' || !value.learnerId.trim()) return [];
    return [{
      id: value.id,
      learnerId: value.learnerId,
      firstName: nullableText(value.firstName),
      grade: nullableText(value.grade),
      avatarUrl: nullableText(value.avatarUrl),
      available: value.available === true,
    }];
  });
}

export function normalizeCurrentProfile(payload: unknown): {
  kind: 'parent' | 'child';
  childId: string | null;
  learner: Record<string, unknown> | null;
  expiresAt: string;
} | null {
  if (!record(payload) || (payload.kind !== 'parent' && payload.kind !== 'child') || typeof payload.expiresAt !== 'string') return null;
  if (payload.kind === 'child' && typeof payload.childId !== 'string') return null;
  return {
    kind: payload.kind,
    childId: typeof payload.childId === 'string' ? payload.childId : null,
    learner: record(payload.learner) ? payload.learner : null,
    expiresAt: payload.expiresAt,
  };
}

export async function familyRpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  // Generated schema types are extended by the family migration at deployment time.
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) {
    if (error.code === 'PGRST202') throw new Error('family.backendUnavailable');
    throw error;
  }
  const payload: unknown = data;
  if (payload && typeof payload === 'object' && 'error' in payload) throw new Error(String(payload.error));
  return data as T;
}
export function learnerFromRow(row: Record<string, unknown>): User {
  return {
    id: String(row.id), aud: 'authenticated', created_at: String(row.created_at ?? ''),
    app_metadata: {}, user_metadata: { ...row, user_type: 'student' },
    email: typeof row.email === 'string' ? row.email : undefined,
  };
}
export function readSelection(accountId: string, sessionId: string): { token: string } | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(`stuwy:family:${accountId}`) ?? 'null');
    // A family grant belongs to one Auth session. Never carry a child or
    // parent selection across sign-out/sign-in, while still restoring it on a
    // normal refresh of the same session.
    return value && value.sessionId === sessionId && typeof value.token === 'string'
      ? { token: value.token }
      : null;
  } catch { return null; }
}
