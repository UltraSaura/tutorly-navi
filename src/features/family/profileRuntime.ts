import type { User } from '@supabase/supabase-js';

// Request credentials are scoped to a profile, never a replacement Auth session.
let profile: { family: boolean; user: User | null; token: string | null; legacyGuardian?: boolean } | null = null;
let generation = 0;
const requests = new Set<AbortController>();
const jobs = new Set<symbol>();
const listeners = new Set<() => void>();
export const getProfileRuntime = () => profile;
export const guardianExplanationCacheTable = () => profile?.legacyGuardian ? 'exercise_explanations_cache' as const : 'learner_explanations_cache' as const;
export const getProfileGeneration = () => generation;
export const profileIsBusy = () => jobs.size > 0;
export const subscribeProfileBusy = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export function beginLearnerJob() {
  const id = Symbol();
  jobs.add(id);
  listeners.forEach(fn => fn());
  return () => { jobs.delete(id); listeners.forEach(fn => fn()); };
}
export function setProfileRuntime(next: typeof profile) {
  generation++;
  requests.forEach(controller => controller.abort());
  requests.clear();
  profile = next;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('stuwy:profile-changed'));
}
export const learnerStorageKey = (key: string, learnerId: string | null | undefined = profile?.user?.id) => `${key}:learner:${learnerId ?? 'guest'}`;

export async function profileFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const epoch = generation;
  const scope = profile;
  const url = String(input instanceof Request ? input.url : input);
  // Auth and approval belong to the account, so profile initialization must not
  // abort them and accidentally sign an independent/unenrolled account back out.
  const pathname = new URL(url, 'http://localhost').pathname;
  const accountRequest = pathname.startsWith('/auth/v1/') || pathname === '/rest/v1/rpc/family_bootstrap';
  const controller = new AbortController();
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  // Remove any caller-supplied profile credential: only the active server grant is used.
  headers.delete('x-family-grant');
  if (!accountRequest && scope?.token) headers.set('x-family-grant', scope.token);
  const upstreamSignal = init?.signal ?? (input instanceof Request ? input.signal : null);
  const abort = () => controller.abort();
  upstreamSignal?.addEventListener('abort', abort, { once: true });
  if (upstreamSignal?.aborted) controller.abort();
  if (!accountRequest) requests.add(controller);
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  // Mutations retain their original learner: switching is blocked until they finish.
  const finish = !accountRequest && !['GET', 'HEAD', 'OPTIONS'].includes(method) && !url.includes('/rpc/family_')
    ? beginLearnerJob() : () => {};
  try {
    const response = await fetch(input, { ...init, headers, signal: controller.signal });
    if (!accountRequest && epoch !== generation) throw new DOMException('Profile changed', 'AbortError');
    if (scope?.family && scope.token && response.status === 403) {
      window.dispatchEvent(new Event('stuwy:family-expired'));
    }
    return response;
  } finally {
    requests.delete(controller);
    upstreamSignal?.removeEventListener('abort', abort);
    finish();
  }
}

export function learnerOperation<Args extends unknown[], Result>(operation: (...args: Args) => Result, epoch = generation) {
  return async (...args: Args): Promise<Awaited<Result>> => {
    if (epoch !== generation) throw new DOMException('Profile changed', 'AbortError');
    const finish = beginLearnerJob();
    try { return await operation(...args); }
    finally { finish(); }
  };
}
