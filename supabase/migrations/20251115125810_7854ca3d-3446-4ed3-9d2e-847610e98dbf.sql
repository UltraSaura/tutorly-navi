-- Add curriculum location fields to learning_topics table
ALTER TABLE learning_topics 
ADD COLUMN curriculum_country_code TEXT,
ADD COLUMN curriculum_level_code TEXT,
ADD COLUMN curriculum_subject_id TEXT,
ADD COLUMN curriculum_domain_id TEXT,
ADD COLUMN curriculum_subdomain_id TEXT;

-- Add index for better query performance
CREATE INDEX idx_learning_topics_curriculum 
ON learning_topics(curriculum_country_code, curriculum_level_code, curriculum_subject_id);

-- Add comments for documentation
COMMENT ON COLUMN learning_topics.curriculum_country_code IS 'Country code from curriculumBundle.json (e.g., "fr")';
COMMENT ON COLUMN learning_topics.curriculum_level_code IS 'Level code from curriculumBundle.json (e.g., "cm1")';
COMMENT ON COLUMN learning_topics.curriculum_subject_id IS 'Subject ID from curriculumBundle.json (e.g., "math")';
COMMENT ON COLUMN learning_topics.curriculum_domain_id IS 'Domain ID from curriculumBundle.json';
COMMENT ON COLUMN learning_topics.curriculum_subdomain_id IS 'Subdomain ID from curriculumBundle.json';