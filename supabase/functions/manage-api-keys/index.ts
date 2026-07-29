import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const obfuscate = (key: string) =>
  key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : '****';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin check via user_roles
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, keyId, providerId, name, keyValue } = await req.json();
    console.log('API key management request:', { action, keyId, providerId, name, userId: user.id });

    switch (action) {
      case 'add': {
        if (!providerId || !name || !keyValue) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: providerId, name, keyValue' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: newKey, error: dbError } = await supabase
          .from('ai_model_keys')
          .insert({
            provider_id: providerId,
            name,
            key_value: keyValue, // stored full; table is admin-only via RLS, service role used here
            is_active: true,
          })
          .select('id, provider_id, name, created_at, updated_at, is_active')
          .single();

        if (dbError) {
          console.error('Database insert error:', dbError);
          return new Response(
            JSON.stringify({ error: dbError.message || 'Failed to save API key' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, key: { ...newKey, key_value: obfuscate(keyValue) } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'retrieve': {
        if (!keyId) {
          return new Response(
            JSON.stringify({ error: 'Missing keyId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: keyData, error: keyError } = await supabase
          .from('ai_model_keys')
          .select('key_value, name')
          .eq('id', keyId)
          .eq('is_active', true)
          .maybeSingle();

        if (keyError || !keyData) {
          return new Response(
            JSON.stringify({ error: 'API key not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, key_value: keyData.key_value, name: keyData.name }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!keyId) {
          return new Response(
            JSON.stringify({ error: 'Missing keyId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: dbError } = await supabase
          .from('ai_model_keys')
          .update({ is_active: false })
          .eq('id', keyId);

        if (dbError) {
          return new Response(
            JSON.stringify({ error: dbError.message || 'Failed to delete API key' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (err) {
    console.error('manage-api-keys unhandled error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
