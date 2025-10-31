import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for vault access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from authorization header
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

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !userRole) {
      console.error('Role check error:', roleError);
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

        // Generate unique vault secret name
        const vaultSecretName = `api_key_${providerId}_${Date.now()}`;

        // Store the actual key in Vault using SQL
        const { error: vaultError } = await supabase.rpc('create_vault_secret', {
          secret_name: vaultSecretName,
          secret_value: keyValue
        });

        if (vaultError) {
          // Fallback: If vault RPC doesn't exist, create it inline
          const { error: createError } = await supabase.from('vault.secrets').insert({
            name: vaultSecretName,
            secret: keyValue
          });

          if (createError) {
            console.error('Vault storage error:', createError);
            return new Response(
              JSON.stringify({ error: 'Failed to store API key securely' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Store reference in database with obfuscated display value
        const obfuscatedKey = keyValue.length > 8 
          ? `${keyValue.substring(0, 4)}...${keyValue.substring(keyValue.length - 4)}`
          : '****';

        const { data: newKey, error: dbError } = await supabase
          .from('ai_model_keys')
          .insert({
            provider_id: providerId,
            name,
            key_value: obfuscatedKey,
            vault_secret_name: vaultSecretName
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database insert error:', dbError);
          return new Response(
            JSON.stringify({ error: 'Failed to save API key reference' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('API key added successfully:', newKey.id);
        return new Response(
          JSON.stringify({ success: true, key: newKey }),
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

        // Get vault secret name from database
        const { data: keyData, error: keyError } = await supabase
          .from('ai_model_keys')
          .select('vault_secret_name, name')
          .eq('id', keyId)
          .eq('is_active', true)
          .single();

        if (keyError || !keyData?.vault_secret_name) {
          console.error('Key lookup error:', keyError);
          return new Response(
            JSON.stringify({ error: 'API key not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Retrieve actual key from Vault
        const { data: vaultData, error: vaultError } = await supabase
          .from('vault.secrets')
          .select('decrypted_secret')
          .eq('name', keyData.vault_secret_name)
          .single();

        if (vaultError || !vaultData) {
          console.error('Vault retrieval error:', vaultError);
          return new Response(
            JSON.stringify({ error: 'Failed to retrieve API key from vault' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('API key retrieved successfully:', keyId);
        return new Response(
          JSON.stringify({ 
            success: true, 
            keyValue: vaultData.decrypted_secret,
            name: keyData.name 
          }),
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

        // Get vault secret name before deleting
        const { data: keyData, error: keyError } = await supabase
          .from('ai_model_keys')
          .select('vault_secret_name')
          .eq('id', keyId)
          .single();

        if (keyError) {
          console.error('Key lookup error:', keyError);
          return new Response(
            JSON.stringify({ error: 'API key not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Soft delete in database
        const { error: deleteError } = await supabase
          .from('ai_model_keys')
          .update({ is_active: false })
          .eq('id', keyId);

        if (deleteError) {
          console.error('Database delete error:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Failed to delete API key' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Optionally delete from vault (commented out to keep vault history)
        // This prevents reusing the same vault secret name
        /*
        if (keyData.vault_secret_name) {
          await supabase.from('vault.secrets')
            .delete()
            .eq('name', keyData.vault_secret_name);
        }
        */

        console.log('API key deleted successfully:', keyId);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: add, retrieve, or delete' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in manage-api-keys function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
