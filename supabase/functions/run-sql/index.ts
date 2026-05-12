import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey || token !== serviceKey) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  const dbUrl = Deno.env.get('SUPABASE_DB_URL');
  if (!dbUrl) return jsonResponse({ success: false, error: 'SUPABASE_DB_URL is not configured' }, 500);

  const payload = await req.json().catch(() => null) as { sql?: unknown } | null;
  if (!payload || typeof payload.sql !== 'string' || payload.sql.trim().length === 0) {
    return jsonResponse({ success: false, error: 'SQL body is required' }, 400);
  }

  const client = new Client(dbUrl);
  try {
    await client.connect();
    await client.queryArray(payload.sql);
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 200);
  } finally {
    await client.end();
  }
});
