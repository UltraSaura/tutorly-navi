-- Add source tracking columns to quiz_banks for AI-generated quizzes
ALTER TABLE quiz_banks
ADD COLUMN source_type TEXT DEFAULT 'manual',
ADD COLUMN source_video_ids UUID[] DEFAULT NULL,
ADD COLUMN source_text_snapshot TEXT DEFAULT NULL;

COMMENT ON COLUMN quiz_banks.source_type IS 'manual | video_transcript | multi_video_transcript';
COMMENT ON COLUMN quiz_banks.source_video_ids IS 'Array of video IDs used to generate this bank';
COMMENT ON COLUMN quiz_banks.source_text_snapshot IS 'Optional: snapshot of aggregated transcript for deterministic regeneration';