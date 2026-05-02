ALTER TABLE public.prompt_templates
  DROP CONSTRAINT IF EXISTS prompt_templates_usage_type_check;

ALTER TABLE public.prompt_templates
  ADD CONSTRAINT prompt_templates_usage_type_check
  CHECK (usage_type IN (
    'chat',
    'grading',
    'explanation',
    'math_enhanced',
    'grouped_retry_practice'
  ));