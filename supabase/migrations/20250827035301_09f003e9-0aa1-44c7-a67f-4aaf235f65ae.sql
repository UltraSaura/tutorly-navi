-- Update Math Explanation Generator to be part of Chat Assistant category
UPDATE prompt_templates 
SET usage_type = 'chat'
WHERE name = 'Math Explanation Generator' AND usage_type = 'explanation';