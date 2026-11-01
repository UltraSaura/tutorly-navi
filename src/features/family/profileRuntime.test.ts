import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { beginLearnerJob, getProfileRuntime, learnerOperation, learnerStorageKey, profileFetch, profileIsBusy, setProfileRuntime } from './profileRuntime';

const learner = (id: string) => ({ id, user_metadata: {}, app_metadata: {}, aud: 'authenticated', created_at: '' } as User);
beforeEach(() => { vi.stubGlobal('window', new EventTarget()); setProfileRuntime(null); });
afterEach(() => { setProfileRuntime(null); vi.unstubAllGlobals(); });

describe('family request isolation', () => {
  it.each(['/auth/v1/token', '/rest/v1/rpc/family_bootstrap'])('keeps account request %s alive during profile initialization', async path => {
    let release!: (response: Response) => void;
    let signal!: AbortSignal;
    let headers!: Headers;
    vi.stubGlobal('fetch', vi.fn((_url, init) => { signal = init.signal; headers = init.headers; return new Promise<Response>(resolve => { release = resolve; }); }));
    setProfileRuntime({ family: true, user: learner('a'), token: 'grant-a' });
    const pending = profileFetch(`https://example.test${path}`, { method: 'POST' });
    setProfileRuntime({ family: false, user: learner('legacy'), token: null });
    expect(signal.aborted).toBe(false);
    expect(headers.has('x-family-grant')).toBe(false);
    release(new Response('{}'));
    await expect(pending).resolves.toBeInstanceOf(Response);
  });
  it('aborts an outstanding learner read and rejects a late response after a switch', async () => {
    let release!: (response: Response) => void;
    let signal!: AbortSignal;
    vi.stubGlobal('fetch', vi.fn((_url, init) => { signal = init.signal; return new Promise<Response>(resolve => { release = resolve; }); }));
    setProfileRuntime({ family: true, user: learner('child-a'), token: 'grant-a' });
    const pending = profileFetch('https://example.test/rest/v1/exercise_history');
    setProfileRuntime({ family: true, user: learner('child-b'), token: 'grant-b' });
    expect(signal.aborted).toBe(true);
    release(new Response('[{"user_id":"child-a"}]'));
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(getProfileRuntime()?.user?.id).toBe('child-b');
  });
  it('attaches the active grant, not a caller-supplied grant, while preserving the Auth bearer', async () => {
    const mock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', mock);
    setProfileRuntime({ family: true, user: learner('a'), token: 'verified-grant' });
    await profileFetch('https://example.test/rest/v1/users', { headers: { Authorization: 'Bearer parent-auth-session', 'x-family-grant': 'forged' } });
    const headers = mock.mock.calls[0][1].headers as Headers;
    expect(headers.get('authorization')).toBe('Bearer parent-auth-session');
    expect(headers.get('x-family-grant')).toBe('verified-grant');
  });
  it('retains the busy lock across gaps between the grading request and saving history', async () => {
    let release!: () => void;
    const submit = learnerOperation(async () => { await new Promise<void>(resolve => { release = resolve; }); return 'saved'; });
    const pending = submit();
    expect(profileIsBusy()).toBe(true);
    release();
    await expect(pending).resolves.toBe('saved');
    expect(profileIsBusy()).toBe(false);
  });
  it('rejects a handler retained from the previous learner before it can submit', async () => {
    setProfileRuntime({ family: true, user: learner('a'), token: 'a' });
    const handler = vi.fn();
    const stale = learnerOperation(handler);
    setProfileRuntime({ family: true, user: learner('b'), token: 'b' });
    await expect(stale()).rejects.toMatchObject({ name: 'AbortError' });
    expect(handler).not.toHaveBeenCalled();
  });
  it('isolates offline lesson resume keys', () => {
    setProfileRuntime({ family: true, user: learner('a'), token: 'a' });
    const key = learnerStorageKey('lesson:fractions');
    setProfileRuntime({ family: true, user: learner('b'), token: 'b' });
    expect(learnerStorageKey('lesson:fractions')).not.toBe(key);
  });
  it('keeps independent student identity and has no family authorization header', async () => {
    const mock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', mock);
    setProfileRuntime({ family: false, user: learner('independent'), token: null });
    await profileFetch('https://example.test/rest/v1/users');
    expect((mock.mock.calls[0][1].headers as Headers).has('x-family-grant')).toBe(false);
    expect(getProfileRuntime()?.user?.id).toBe('independent');
  });
  it('cleans up a failed operation without permanently preventing profile changes', async () => {
    await expect(learnerOperation(async () => { throw new Error('failed'); })()).rejects.toThrow('failed');
    expect(profileIsBusy()).toBe(false);
    const done = beginLearnerJob(); expect(profileIsBusy()).toBe(true); done(); expect(profileIsBusy()).toBe(false);
  });
});
