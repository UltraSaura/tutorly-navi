-- Create a helper function to securely create vault secrets
-- This function allows edge functions to create vault secrets without direct vault access

CREATE OR REPLACE FUNCTION public.create_vault_secret(
  secret_name TEXT,
  secret_value TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  -- Insert into vault.secrets table (Supabase Vault)
  INSERT INTO vault.secrets (name, secret)
  VALUES (secret_name, secret_value);
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.create_vault_secret(TEXT, TEXT) TO service_role;

-- Add comment explaining the function
COMMENT ON FUNCTION public.create_vault_secret IS 'Helper function for edge functions to create vault secrets. Only accessible by service role for security.';