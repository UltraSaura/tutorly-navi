import type { AuthResponse, SupabaseClient } from '@supabase/supabase-js';

export const getPasswordRecoveryRedirectUrl = (origin: string): string => {
  const base = origin.replace(/\/$/, '');
  return `${base}/auth`;
};

export const isPasswordRecoveryUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const values = new URLSearchParams(`${parsed.search}${parsed.hash.replace(/^#/, '?')}`);
    return values.get('type') === 'recovery';
  } catch {
    return false;
  }
};

type RecoveryAuth = Pick<SupabaseClient['auth'], 'resetPasswordForEmail' | 'updateUser'>;

export const requestPasswordReset = async (
  auth: RecoveryAuth,
  email: string,
  origin: string,
): Promise<{ error: AuthError | null }> => auth.resetPasswordForEmail(email, {
  redirectTo: getPasswordRecoveryRedirectUrl(origin),
});

export const updateRecoveredPassword = async (
  auth: RecoveryAuth,
  password: string,
): Promise<{ error: AuthError | null }> => auth.updateUser({ password });
