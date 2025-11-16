-- Add curriculum location fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS curriculum_country_code TEXT,
ADD COLUMN IF NOT EXISTS curriculum_level_code TEXT;

-- Add curriculum location fields to children table
ALTER TABLE children
ADD COLUMN IF NOT EXISTS curriculum_country_code TEXT,
ADD COLUMN IF NOT EXISTS curriculum_level_code TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.curriculum_country_code IS 'Country code from curriculumBundle.json (e.g., "fr")';
COMMENT ON COLUMN users.curriculum_level_code IS 'Level code from curriculumBundle.json (e.g., "cm1", "cm2")';
COMMENT ON COLUMN children.curriculum_country_code IS 'Country code from curriculumBundle.json';
COMMENT ON COLUMN children.curriculum_level_code IS 'Level code from curriculumBundle.json';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_curriculum ON users(curriculum_country_code, curriculum_level_code);
CREATE INDEX IF NOT EXISTS idx_children_curriculum ON children(curriculum_country_code, curriculum_level_code);