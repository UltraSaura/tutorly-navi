import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { familyClient, familyCorsHeaders } from '../_shared/family-access.ts';

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: familyCorsHeaders });
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: familyCorsHeaders });
  try {
    const { user, isFamily } = await familyClient(req);
    if (!isFamily || !user.email) throw new Error('Unauthorized');
    const { password, pin } = await req.json();
    if (typeof password !== 'string' || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) throw new Error('Invalid request');
    // getUser verified this JWT before the session claim is used; do not trust an unverified payload.
    const jwt = req.headers.get('authorization')!.replace(/^Bearer\s+/i, '');
    const claims = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: allowed, error: rateError } = await service.rpc('family_pin_reauth_attempt', { account: user.id, sid: claims.session_id });
    if (rateError || !allowed) return Response.json({ error: 'rate_limited' }, { status: 429, headers: familyCorsHeaders });
    // Password verification is server-side and tied to the authenticated parent account.
    const verifier = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await verifier.auth.signInWithPassword({ email: user.email, password });
    if (error || data.user?.id !== user.id) throw new Error('Reauthentication failed');
    try {
      const { error: writeError } = await service.rpc('family_set_pin', { account: user.id, sid: claims.session_id, new_pin: pin });
      if (writeError) throw writeError;
    } finally { await verifier.auth.signOut({ scope: 'local' }); }
    return Response.json({ ok: true }, { headers: familyCorsHeaders });
  } catch {
    // Never log passwords, PINs, bearer tokens, or hashes.
    return Response.json({ error: 'Parent authorization failed' }, { status: 403, headers: familyCorsHeaders });
  }
});
