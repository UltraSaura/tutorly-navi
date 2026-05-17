// Shared helper to resolve an API key for a given provider.
// Resolution order:
//   1. Most recent active row in public.ai_model_keys joined to ai_model_providers by name
//   2. Fall back to the corresponding edge-function secret (e.g. DEEPSEEK_API_KEY)
//   3. Throws if neither exists.
//
// A short in-memory cache avoids hitting the DB on every chat call.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type CacheEntry = { value: string; source: 'db' | 'env'; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000; // 1 minute

const ENV_VAR_BY_PROVIDER: Record<string, string> = {
  DeepSeek: 'DEEPSEEK_API_KEY',
  OpenAI: 'OPENAI_API_KEY',
  Mistral: 'MISTRAL_API_KEY',
  Anthropic: 'ANTHROPIC_API_KEY',
  Google: 'GOOGLE_API_KEY',
  xAI: 'XAI_API_KEY',
};

export interface ResolvedKey {
  value: string;
  source: 'db' | 'env';
}

export async function resolveProviderKey(providerName: string): Promise<ResolvedKey> {
  const cached = cache.get(providerName);
  if (cached && cached.expiresAt > Date.now()) {
    return { value: cached.value, source: cached.source };
  }

  // 1. Try DB
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data: provider } = await supabase
        .from('ai_model_providers')
        .select('id')
        .eq('name', providerName)
        .maybeSingle();

      if (provider?.id) {
        const { data: keyRow } = await supabase
          .from('ai_model_keys')
          .select('key_value')
          .eq('provider_id', provider.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (keyRow?.key_value && !keyRow.key_value.includes('•') && !keyRow.key_value.includes('...')) {
          cache.set(providerName, { value: keyRow.key_value, source: 'db', expiresAt: Date.now() + TTL_MS });
          return { value: keyRow.key_value, source: 'db' };
        }
      }
    }
  } catch (e) {
    console.warn(`[resolveProviderKey] DB lookup failed for ${providerName}:`, e);
  }

  // 2. Fall back to env secret
  const envVar = ENV_VAR_BY_PROVIDER[providerName];
  const envValue = envVar ? Deno.env.get(envVar) : undefined;
  if (envValue) {
    cache.set(providerName, { value: envValue, source: 'env', expiresAt: Date.now() + TTL_MS });
    return { value: envValue, source: 'env' };
  }

  throw new Error(`No API key configured for provider "${providerName}" (checked ai_model_keys and ${envVar ?? 'env'})`);
}

export function clearProviderKeyCache(providerName?: string) {
  if (providerName) cache.delete(providerName);
  else cache.clear();
}
