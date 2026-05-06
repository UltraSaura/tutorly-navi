CREATE TABLE IF NOT EXISTS public.app_feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_feature_flags ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_feature_flags (key, enabled, description, metadata)
VALUES (
  'adaptive_teaching_recommendations_enabled',
  false,
  'When enabled, analytics-derived teaching support recommendations may gently bias support formats. Off by default while data is collected.',
  '{"minimumRelevantEvents":20,"minimumAnsweredAfterSupport":5,"recommendedStyleShare":0.7,"mixedStyleShare":0.3}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.update_app_feature_flags_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_feature_flags_updated_at ON public.app_feature_flags;
CREATE TRIGGER trg_app_feature_flags_updated_at
  BEFORE UPDATE ON public.app_feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_app_feature_flags_updated_at();

DROP POLICY IF EXISTS "Authenticated users can read app feature flags"
  ON public.app_feature_flags;
CREATE POLICY "Authenticated users can read app feature flags"
  ON public.app_feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage app feature flags"
  ON public.app_feature_flags;
CREATE POLICY "Admins can manage app feature flags"
  ON public.app_feature_flags
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.app_feature_flags IS
  'Runtime feature flags. adaptive_teaching_recommendations_enabled is intentionally false by default.';
