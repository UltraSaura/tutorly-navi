-- Update Math Two-Card Teacher to be the primary chat assistant for math
UPDATE prompt_templates 
SET 
  usage_type = 'chat',
  is_active = true,
  priority = 15
WHERE name = 'Math Two-Card Teacher';

-- Deactivate competing math chat prompts to avoid conflicts
UPDATE prompt_templates 
SET is_active = false
WHERE name IN ('Math Explanation Generator', 'Math Specialist') AND usage_type = 'chat';