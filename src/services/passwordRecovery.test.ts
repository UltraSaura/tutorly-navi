import { describe, expect, it, vi } from 'vitest';
import {
  getPasswordRecoveryRedirectUrl,
  isPasswordRecoveryUrl,
  requestPasswordReset,
  updateRecoveredPassword,
} from './passwordRecovery';

describe('password recovery flow', () => {
  it('always redirects recovery links to the app auth route', () => {
    expect(getPasswordRecoveryRedirectUrl('https://staging.example/')).toBe('https://staging.example/auth');
    expect(getPasswordRecoveryRedirectUrl('http://localhost:8080')).toBe('http://localhost:8080/auth');
  });
  it('honors the native reset callback and parses mixed query/fragment URLs', () => {
    expect(getPasswordRecoveryRedirectUrl('https://localhost', 'stuwy-staging://auth/callback')).toBe('stuwy-staging://auth/callback');
    expect(isPasswordRecoveryUrl('stuwy-staging://auth/callback?source=email#type=recovery')).toBe(true);
  });

  it('recognizes Supabase recovery links in the hash and rejects ordinary links', () => {
    expect(isPasswordRecoveryUrl('https://staging.example/auth#access_token=token&type=recovery')).toBe(true);
    expect(isPasswordRecoveryUrl('https://staging.example/auth?type=recovery')).toBe(true);
    expect(isPasswordRecoveryUrl('https://staging.example/auth#type=signup')).toBe(false);
    expect(isPasswordRecoveryUrl('not a url')).toBe(false);
  });

  it('passes the staging origin to Supabase and surfaces request errors', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ data: {}, error: null });
    const auth = { resetPasswordForEmail, updateUser: vi.fn() } as never;
    await requestPasswordReset(auth, 'anwkasso@gmail.com', 'https://staging.example');
    expect(resetPasswordForEmail).toHaveBeenCalledWith('anwkasso@gmail.com', {
      redirectTo: 'https://staging.example/auth',
    });

    const error = new Error('SMTP unavailable');
    resetPasswordForEmail.mockResolvedValue({ data: {}, error });
    await expect(requestPasswordReset(auth, 'anwkasso@gmail.com', 'https://staging.example'))
      .resolves.toEqual({ data: {}, error });
  });

  it('calls updateUser for the password form and returns its error', async () => {
    const updateUser = vi.fn().mockResolvedValue({ data: {}, error: null });
    const auth = { resetPasswordForEmail: vi.fn(), updateUser } as never;
    await updateRecoveredPassword(auth, 'new-password-123');
    expect(updateUser).toHaveBeenCalledWith({ password: 'new-password-123' });
  });
});
