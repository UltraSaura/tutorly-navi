import { describe, expect, it, vi } from 'vitest';
import { createNativeAuthCallback } from './nativeAuthCallback';

const setup = () => {
  const auth = { setSession: vi.fn().mockResolvedValue({ error: null }), exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }) };
  const options = { callbackUrl: 'stuwy-staging://auth/callback', auth, setRecovery: vi.fn(), navigate: vi.fn(), reportError: vi.fn() };
  return { ...options, handle: createNativeAuthCallback(options) };
};
describe('native email authentication', () => {
  it('consumes an implicit recovery session without forwarding credentials to navigation', async () => {
    const t = setup();
    await t.handle('stuwy-staging://auth/callback#access_token=access&refresh_token=refresh&type=recovery');
    expect(t.setRecovery).toHaveBeenCalledWith(true);
    expect(t.auth.setSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
    expect(t.navigate).toHaveBeenCalledWith();
  });
  it('exchanges PKCE codes and handles duplicate launch/open events once', async () => {
    const t = setup(); const url = 'stuwy-staging://auth/callback?code=one-use';
    await Promise.all([t.handle(url), t.handle(url)]);
    expect(t.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(t.setRecovery).not.toHaveBeenCalled();
    expect(t.navigate).toHaveBeenCalledTimes(1);
  });
  it.each(['https://auth/callback?code=x', 'stuwy-staging://other/callback?code=x', 'stuwy-staging://auth/callback/extra?code=x', 'stuwy-staging://user@auth/callback?code=x', 'not a url'])('ignores unrelated links: %s', async (url) => {
    const t = setup(); await t.handle(url);
    expect(t.auth.setSession).not.toHaveBeenCalled(); expect(t.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(t.navigate).not.toHaveBeenCalled();
  });
  it('does not authenticate incomplete tokens or callback errors', async () => {
    const t = setup();
    await t.handle('stuwy-staging://auth/callback#access_token=only');
    await t.handle('stuwy-staging://auth/callback?error=access_denied&code=x');
    expect(t.auth.setSession).not.toHaveBeenCalled(); expect(t.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(t.reportError).toHaveBeenCalledTimes(2);
  });
  it('surfaces failed sessions safely and permits a subsequent valid link', async () => {
    const t = setup(); t.auth.setSession.mockResolvedValueOnce({ error: new Error('expired') });
    const url = 'stuwy-staging://auth/callback#access_token=a&refresh_token=b&type=recovery';
    await t.handle(url);
    expect(t.setRecovery).toHaveBeenLastCalledWith(false);
    expect(t.reportError).toHaveBeenCalledWith(); expect(t.navigate).not.toHaveBeenCalled();
    await t.handle('stuwy-staging://auth/callback?code=valid');
    expect(t.navigate).toHaveBeenCalledTimes(1);
  });
});
