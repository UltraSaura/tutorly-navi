-- Add variant_group_id to link language variants of the same video
ALTER TABLE learning_videos 
ADD COLUMN variant_group_id UUID DEFAULT NULL;

-- Index for efficient variant group lookups
CREATE INDEX idx_learning_videos_variant_group ON learning_videos(variant_group_id);

-- Ensure only one variant per language within a group
CREATE UNIQUE INDEX idx_learning_videos_unique_language_per_group 
ON learning_videos(variant_group_id, language) 
WHERE variant_group_id IS NOT NULL;