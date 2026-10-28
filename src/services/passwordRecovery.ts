import type { AuthError, SupabaseClient } from '@supabase/supabase-js';

export const getPasswordRecoveryRedirectUrl = (origin: string, override = import.meta.env.VITE_AUTH_RESET_REDIRECT_URL): string => {
  if (override) return override;
  const base = origin.replace(/\/$/, '');
  return `${base}/auth`;
};

export const isPasswordRecoveryUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return new URLSearchParams(parsed.hash.slice(1)).get('type') === 'recovery'
      || parsed.searchParams.get('type') === 'recovery';
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
