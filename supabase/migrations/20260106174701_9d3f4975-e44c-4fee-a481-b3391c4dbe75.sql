-- Function to update video_count in learning_topics
CREATE OR REPLACE FUNCTION public.update_topic_video_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_active = true THEN
      UPDATE public.learning_topics 
      SET video_count = (
        SELECT COUNT(*) FROM public.learning_videos 
        WHERE topic_id = NEW.topic_id AND is_active = true
      )
      WHERE id = NEW.topic_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE public.learning_topics 
    SET video_count = (
      SELECT COUNT(*) FROM public.learning_videos 
      WHERE topic_id = OLD.topic_id AND is_active = true
    )
    WHERE id = OLD.topic_id;
    RETURN OLD;
  END IF;
  
  -- Handle UPDATE (topic_id or is_active changed)
  IF TG_OP = 'UPDATE' THEN
    -- If topic changed, update both old and new topics
    IF OLD.topic_id IS DISTINCT FROM NEW.topic_id THEN
      UPDATE public.learning_topics 
      SET video_count = (
        SELECT COUNT(*) FROM public.learning_videos 
        WHERE topic_id = OLD.topic_id AND is_active = true
      )
      WHERE id = OLD.topic_id;
      
      UPDATE public.learning_topics 
      SET video_count = (
        SELECT COUNT(*) FROM public.learning_videos 
        WHERE topic_id = NEW.topic_id AND is_active = true
      )
      WHERE id = NEW.topic_id;
    -- If only is_active changed, update current topic
    ELSIF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      UPDATE public.learning_topics 
      SET video_count = (
        SELECT COUNT(*) FROM public.learning_videos 
        WHERE topic_id = NEW.topic_id AND is_active = true
      )
      WHERE id = NEW.topic_id;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update quiz_count in learning_topics
CREATE OR REPLACE FUNCTION public.update_topic_quiz_count()
RETURNS TRIGGER AS $$
DECLARE
  v_topic_id UUID;
BEGIN
  -- Get topic_id from video
  IF TG_OP = 'DELETE' THEN
    SELECT topic_id INTO v_topic_id FROM public.learning_videos WHERE id = OLD.video_id;
  ELSE
    SELECT topic_id INTO v_topic_id FROM public.learning_videos WHERE id = NEW.video_id;
  END IF;
  
  IF v_topic_id IS NOT NULL THEN
    UPDATE public.learning_topics 
    SET quiz_count = (
      SELECT COUNT(*) FROM public.video_quizzes vq
      JOIN public.learning_videos lv ON lv.id = vq.video_id
      WHERE lv.topic_id = v_topic_id AND lv.is_active = true
    )
    WHERE id = v_topic_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for learning_videos
DROP TRIGGER IF EXISTS trigger_update_topic_video_count ON public.learning_videos;
CREATE TRIGGER trigger_update_topic_video_count
AFTER INSERT OR UPDATE OR DELETE ON public.learning_videos
FOR EACH ROW EXECUTE FUNCTION public.update_topic_video_count();

-- Create triggers for video_quizzes
DROP TRIGGER IF EXISTS trigger_update_topic_quiz_count ON public.video_quizzes;
CREATE TRIGGER trigger_update_topic_quiz_count
AFTER INSERT OR UPDATE OR DELETE ON public.video_quizzes
FOR EACH ROW EXECUTE FUNCTION public.update_topic_quiz_count();

-- Recalculate all existing counts to fix current data
UPDATE public.learning_topics lt
SET 
  video_count = (
    SELECT COUNT(*) FROM public.learning_videos lv 
    WHERE lv.topic_id = lt.id AND lv.is_active = true
  ),
  quiz_count = (
    SELECT COUNT(*) FROM public.video_quizzes vq
    JOIN public.learning_videos lv ON lv.id = vq.video_id
    WHERE lv.topic_id = lt.id AND lv.is_active = true
  );