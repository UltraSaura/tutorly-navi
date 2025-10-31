-- Migrate API keys to use Supabase Vault encryption
-- This migration adds support for storing API keys securely in Vault

-- Add column to store vault secret name instead of plain text key
ALTER TABLE public.ai_model_keys 
ADD COLUMN IF NOT EXISTS vault_secret_name TEXT;

-- Add comment explaining the security model
COMMENT ON COLUMN public.ai_model_keys.key_value IS 'DEPRECATED: Use vault_secret_name instead. This column should only contain obfuscated values for display purposes (e.g., "sk-****1234")';
COMMENT ON COLUMN public.ai_model_keys.vault_secret_name IS 'Name of the secret stored in Supabase Vault. Actual API key values are encrypted in Vault and can only be accessed by authorized edge functions.';

-- Update existing keys to have obfuscated values
-- This will require manual migration via edge function, so we just mark them
UPDATE public.ai_model_keys
SET key_value = 'REQUIRES_VAULT_MIGRATION'
WHERE vault_secret_name IS NULL AND key_value IS NOT NULL;

-- Create index on vault_secret_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_model_keys_vault_secret_name 
ON public.ai_model_keys(vault_secret_name) 
WHERE vault_secret_name IS NOT NULL;