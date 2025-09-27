-- Create default subject-prompt assignments for the unified system
-- This ensures the "Unified Math Chat Assistant" template works with math subjects

-- Insert assignments for core math subjects
INSERT INTO public.subject_prompt_assignments (subject_id, prompt_template_id, usage_type, is_primary)
SELECT 
  'math',
  pt.id,
  'unified_math_chat',
  true
FROM public.prompt_templates pt 
WHERE pt.name = 'Unified Math Chat Assistant'
AND NOT EXISTS (
  SELECT 1 FROM public.subject_prompt_assignments spa 
  WHERE spa.subject_id = 'math' AND spa.usage_type = 'unified_math_chat'
);

INSERT INTO public.subject_prompt_assignments (subject_id, prompt_template_id, usage_type, is_primary)
SELECT 
  'algebra',
  pt.id,
  'unified_math_chat',
  true
FROM public.prompt_templates pt 
WHERE pt.name = 'Unified Math Chat Assistant'
AND NOT EXISTS (
  SELECT 1 FROM public.subject_prompt_assignments spa 
  WHERE spa.subject_id = 'algebra' AND spa.usage_type = 'unified_math_chat'
);

INSERT INTO public.subject_prompt_assignments (subject_id, prompt_template_id, usage_type, is_primary)
SELECT 
  'geometry',
  pt.id,
  'unified_math_chat',
  true
FROM public.prompt_templates pt 
WHERE pt.name = 'Unified Math Chat Assistant'
AND NOT EXISTS (
  SELECT 1 FROM public.subject_prompt_assignments spa 
  WHERE spa.subject_id = 'geometry' AND spa.usage_type = 'unified_math_chat'
);

INSERT INTO public.subject_prompt_assignments (subject_id, prompt_template_id, usage_type, is_primary)
SELECT 
  'calculus',
  pt.id,
  'unified_math_chat',
  true
FROM public.prompt_templates pt 
WHERE pt.name = 'Unified Math Chat Assistant'
AND NOT EXISTS (
  SELECT 1 FROM public.subject_prompt_assignments spa 
  WHERE spa.subject_id = 'calculus' AND spa.usage_type = 'unified_math_chat'
);

-- Also assign to explanation type for backward compatibility
INSERT INTO public.subject_prompt_assignments (subject_id, prompt_template_id, usage_type, is_primary)
SELECT 
  'math',
  pt.id,
  'explanation',
  true
FROM public.prompt_templates pt 
WHERE pt.name = 'Unified Math Chat Assistant'
AND NOT EXISTS (
  SELECT 1 FROM public.subject_prompt_assignments spa 
  WHERE spa.subject_id = 'math' AND spa.usage_type = 'explanation'
);