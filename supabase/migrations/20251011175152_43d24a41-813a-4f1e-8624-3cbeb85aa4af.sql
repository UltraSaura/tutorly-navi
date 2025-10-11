-- Phase 1.5: Audit Log for Compliance

-- Create audit_logs table if not exists (merge with existing admin_audit_log concept)
-- Add parent-specific audit tracking
ALTER TABLE public.admin_audit_log
ADD COLUMN IF NOT EXISTS context text,
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Add indices for common queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created 
ON public.admin_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action 
ON public.admin_audit_log(action);

-- Add policy for guardians to view their own actions
CREATE POLICY "Guardians can view their own audit logs"
ON public.admin_audit_log FOR SELECT
USING (admin_id = auth.uid());

-- Add policy for guardians to view actions related to their children
CREATE POLICY "Guardians can view children audit logs"
ON public.admin_audit_log FOR SELECT
USING (
  target_id IN (
    SELECT c.user_id 
    FROM public.children c
    INNER JOIN public.guardian_child_links gcl ON gcl.child_id = c.id
    INNER JOIN public.guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
);