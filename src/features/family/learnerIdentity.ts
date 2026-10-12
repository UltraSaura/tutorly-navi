import { supabase } from '@/integrations/supabase/client';
import { getProfileRuntime } from './profileRuntime';

// Capture this at the beginning of a service operation, before its first await.
export async function getLearnerUser() {
  const scope = getProfileRuntime();
  if (scope) return { data: { user: scope.user }, error: null };
  return supabase.auth.getUser();
}
