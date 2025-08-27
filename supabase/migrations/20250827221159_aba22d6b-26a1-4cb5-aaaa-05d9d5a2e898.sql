-- Fix Math Two-Card Teacher to use explanation usage type
UPDATE prompt_templates 
SET 
  usage_type = 'explanation',
  is_active = true,
  priority = 15
WHERE name = 'Math Two-Card Teacher';

-- Deactivate any existing explanation prompts to avoid conflicts
UPDATE prompt_templates 
SET is_active = false
WHERE usage_type = 'explanation' AND name != 'Math Two-Card Teacher';