-- Keep parent PIN protection on by default, with an explicit admin-controlled
-- switch for temporary testing environments.
INSERT INTO public.app_feature_flags (key, enabled, description, metadata)
VALUES (
  'family_parent_pin_required',
  true,
  'When enabled, family parents must enter their PIN. Disable temporarily for testing only.',
  '{}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.family_bootstrap() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'isFamily', family_private.is_family(),
    'isGuardian', EXISTS(SELECT 1 FROM public.guardians g WHERE g.user_id = auth.uid()),
    'approvalStatus', u.approval_status,
    'pinConfigured', EXISTS(SELECT 1 FROM family_private.pins p WHERE p.account_id = auth.uid()),
    'parentPinRequired', COALESCE((
      SELECT enabled FROM public.app_feature_flags WHERE key = 'family_parent_pin_required'
    ), true)
  )
  FROM public.users u
  WHERE u.id = auth.uid() AND family_private.session_exists();
$$;

CREATE OR REPLACE FUNCTION public.family_unlock_parent(pin text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE hashed text; parent_pin_required boolean;
BEGIN
  IF NOT family_private.is_family() OR NOT family_private.session_live() THEN
    RAISE EXCEPTION 'Not a family session' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE((SELECT enabled FROM public.app_feature_flags WHERE key = 'family_parent_pin_required'), true)
    INTO parent_pin_required;
  IF NOT parent_pin_required THEN
    RETURN family_private.issue_grant('parent');
  END IF;
  -- Committed failure result, not an exception: failed attempts cannot roll back their limiter.
  IF NOT family_private.spend_attempt(auth.uid(), 'pin') THEN
    RETURN jsonb_build_object('error', 'rate_limited');
  END IF;
  SELECT p.pin_hash INTO hashed FROM family_private.pins p WHERE p.account_id = auth.uid();
  IF pin !~ '^[0-9]{6}$' OR hashed IS NULL OR extensions.crypt(pin, hashed) IS DISTINCT FROM hashed THEN
    RETURN jsonb_build_object('error', 'invalid_pin');
  END IF;
  RETURN family_private.issue_grant('parent');
END;
$$;
