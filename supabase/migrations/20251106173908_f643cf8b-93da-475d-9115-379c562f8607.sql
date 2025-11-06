-- Add subject_id to learning_videos table for direct subject association
ALTER TABLE public.learning_videos
ADD COLUMN subject_id uuid REFERENCES public.learning_subjects(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_learning_videos_subject_id ON public.learning_videos(subject_id);