-- Phase 1.3: Delegation Tokens Table

CREATE TABLE IF NOT EXISTS public.delegation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  jti_hash text NOT NULL UNIQUE,
  scope text DEFAULT 'kid_view',
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_delegation_tokens_jti ON public.delegation_tokens(jti_hash);
CREATE INDEX idx_delegation_tokens_expires ON public.delegation_tokens(expires_at);
CREATE INDEX idx_delegation_tokens_child ON public.delegation_tokens(child_id);

-- Enable RLS
ALTER TABLE public.delegation_tokens ENABLE ROW LEVEL SECURITY;

-- Only guardians can create tokens for their children
CREATE POLICY "Guardians can create delegation tokens"
ON public.delegation_tokens FOR INSERT
WITH CHECK (
  guardian_id IN (
    SELECT id FROM public.guardians WHERE user_id = auth.uid()
  )
);

-- Guardians can view their own tokens
CREATE POLICY "Guardians can view their delegation tokens"
ON public.delegation_tokens FOR SELECT
USING (
  guardian_id IN (
    SELECT id FROM public.guardians WHERE user_id = auth.uid()
  )
);

-- System can validate and mark tokens as used
CREATE POLICY "System can update delegation tokens"
ON public.delegation_tokens FOR UPDATE
USING (true);

-- Admins can manage all tokens
CREATE POLICY "Admins can manage delegation tokens"
ON public.delegation_tokens FOR ALL
USING (has_role(auth.uid(), 'admin'));