-- Add display_context and trigger_video_id to quiz_bank_assignments
-- display_context: 'practice' | 'lesson' | 'both'
--   practice  → shown only on the Practice by Topic page
--   lesson    → shown only in the video player, after a specific video completes
--   both      → shown in both contexts
-- trigger_video_id: the exact video whose completion triggers the quiz in lesson context

ALTER TABLE quiz_bank_assignments
  ADD COLUMN IF NOT EXISTS display_context TEXT NOT NULL DEFAULT 'both'
    CHECK (display_context IN ('practice', 'lesson', 'both')),
  ADD COLUMN IF NOT EXISTS trigger_video_id UUID REFERENCES videos(id) ON DELETE SET NULL;

-- Migrate existing rows:
-- Rows with video_ids set → lesson context (they are video-triggered)
-- Rows with only topic_id + trigger_after_n_videos → keep 'both' for backward compat
UPDATE quiz_bank_assignments
SET display_context = 'lesson'
WHERE video_ids IS NOT NULL AND array_length(video_ids, 1) > 0
  AND display_context = 'both';

-- For rows that used trigger_after_n_videos=0, treat as practice-always-available
UPDATE quiz_bank_assignments
SET display_context = 'practice'
WHERE trigger_after_n_videos = 0
  AND video_ids IS NULL
  AND display_context = 'both';
