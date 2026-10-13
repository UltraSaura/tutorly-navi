-- Keep parent child-management sessions usable during normal setup while
-- preserving expiry, explicit locking, and revocation.
CREATE OR REPLACE FUNCTION family_private.issue_grant(kind text, child uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  secret text := encode(extensions.gen_random_bytes(32), 'hex');
  expiry timestamptz;
BEGIN
  IF NOT family_private.is_family() OR NOT family_private.session_live() THEN
    RAISE EXCEPTION 'Not a family session' USING ERRCODE = '42501';
  END IF;

  expiry := now() + CASE
    WHEN kind = 'parent' THEN interval '1 hour'
    ELSE interval '8 hours'
  END;

  INSERT INTO family_private.grants(account_id, session_id, mode, child_id, token_hash, expires_at)
    VALUES(
      auth.uid(),
      (auth.jwt()->>'session_id')::uuid,
      kind,
      child,
      encode(extensions.digest(secret, 'sha256'), 'hex'),
      expiry
    )
  ON CONFLICT (account_id, session_id) DO UPDATE SET
    mode = EXCLUDED.mode,
    child_id = EXCLUDED.child_id,
    token_hash = EXCLUDED.token_hash,
    expires_at = EXCLUDED.expires_at;

  RETURN jsonb_build_object('token', secret, 'expiresAt', expiry);
END;
$function$;
