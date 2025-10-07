-- Add model_function column to ai_models table
-- Supports: default, fallback_primary, fallback_secondary
ALTER TABLE public.ai_models 
ADD COLUMN IF NOT EXISTS model_function TEXT 
CHECK (model_function IN ('default', 'fallback_primary', 'fallback_secondary', NULL))
DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_models_model_function 
ON public.ai_models(model_function) 
WHERE model_function IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.ai_models.model_function IS 'Defines the function of the model: default (primary model), fallback_primary (1st backup), fallback_secondary (2nd backup), or NULL (not assigned)';

-- Ensure only one model per function type
CREATE OR REPLACE FUNCTION public.enforce_single_model_function()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.model_function IS NOT NULL THEN
    -- Clear existing model with same function
    UPDATE public.ai_models 
    SET model_function = NULL 
    WHERE model_function = NEW.model_function 
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single model per function
DROP TRIGGER IF EXISTS enforce_single_model_function_trigger ON public.ai_models;
CREATE TRIGGER enforce_single_model_function_trigger
  BEFORE INSERT OR UPDATE OF model_function ON public.ai_models
  FOR EACH ROW
  WHEN (NEW.model_function IS NOT NULL)
  EXECUTE FUNCTION public.enforce_single_model_function();

-- Create a view to easily get configured models
CREATE OR REPLACE VIEW public.configured_models AS
SELECT 
  MAX(CASE WHEN model_function = 'default' THEN model_id END) as default_model_id,
  MAX(CASE WHEN model_function = 'fallback_primary' THEN model_id END) as fallback_primary_model_id,
  MAX(CASE WHEN model_function = 'fallback_secondary' THEN model_id END) as fallback_secondary_model_id
FROM public.ai_models
WHERE is_active = true;

-- Grant access to the view
GRANT SELECT ON public.configured_models TO authenticated, anon, service_role;

-- Create function to get models with fallback (for Edge Functions)
CREATE OR REPLACE FUNCTION public.get_model_with_fallback()
RETURNS TABLE (
  default_model_id TEXT,
  fallback_primary_model_id TEXT,
  fallback_secondary_model_id TEXT
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    MAX(CASE WHEN model_function = 'default' THEN model_id END) as default_model_id,
    MAX(CASE WHEN model_function = 'fallback_primary' THEN model_id END) as fallback_primary_model_id,
    MAX(CASE WHEN model_function = 'fallback_secondary' THEN model_id END) as fallback_secondary_model_id
  FROM public.ai_models
  WHERE is_active = true AND model_function IS NOT NULL;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_model_with_fallback() TO service_role, authenticated;

-- Set GPT-4.1 as default if it exists
UPDATE public.ai_models 
SET model_function = 'default'
WHERE model_id = 'gpt-4.1-2025-04-14' AND is_active = true;

-- Set GPT-4o-mini as primary fallback if it exists  
UPDATE public.ai_models 
SET model_function = 'fallback_primary'
WHERE model_id = 'gpt-4o-mini' AND is_active = true;

-- Set DeepSeek as secondary fallback if it exists
UPDATE public.ai_models 
SET model_function = 'fallback_secondary'
WHERE model_id = 'deepseek-chat' AND is_active = true;

