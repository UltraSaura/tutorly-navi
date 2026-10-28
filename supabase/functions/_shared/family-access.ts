import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export const familyCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-family-grant',
};
export async function familyClient(req: Request) {
  const authorization = req.headers.get('authorization');
  if (!authorization) throw new Error('Unauthorized');
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization, 'x-family-grant': req.headers.get('x-family-grant') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  const { data: state, error: statusError } = await client.rpc('family_bootstrap');
  if (statusError || !state || state.approvalStatus !== 'approved') throw new Error('Unauthorized');
  return { client, user, isFamily: Boolean(state.isFamily), isGuardian: Boolean(state.isGuardian) };
}
export async function requireLearner(req: Request, expected?: string) {
  const access = await familyClient(req);
  const { data: learnerId, error } = await access.client.rpc('family_current_learner');
  if (error || !learnerId || (expected && expected !== learnerId)) throw new Error('Forbidden learner');
  return { ...access, learnerId: String(learnerId) };
}
export async function requireParent(req: Request) {
  const access = await familyClient(req);
  const { data: allowed, error } = await access.client.rpc('family_parent_authorized');
  // Unenrolled families retain the previous guardian flow during rollout.
  // Endpoint-specific ownership/role checks still run after this guard.
  if (!access.isFamily && access.isGuardian) return access;
  if (!access.isFamily || error || !allowed) throw new Error('Parent authorization required');
  return access;
}

// Existing admin/teacher endpoints must not inherit a parent's roles in child mode.
export async function requirePrivilegedFamily(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (token && token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) return;
  const access = await familyClient(req);
  if (access.isFamily) await requireParent(req);
}
