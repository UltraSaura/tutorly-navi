DO $$
BEGIN
  IF to_regclass('public.learning_subjects') IS NOT NULL
     AND to_regclass('public.subjects') IS NULL THEN
    ALTER TABLE public.learning_subjects RENAME TO subjects;
  END IF;

  IF to_regclass('public.learning_topics') IS NOT NULL
     AND to_regclass('public.topics') IS NULL THEN
    ALTER TABLE public.learning_topics RENAME TO topics;
  END IF;

  IF to_regclass('public.learning_videos') IS NOT NULL
     AND to_regclass('public.videos') IS NULL THEN
    ALTER TABLE public.learning_videos RENAME TO videos;
  END IF;

  IF to_regclass('public.topic_objectives') IS NOT NULL
     AND to_regclass('public.topic_objective_links') IS NULL THEN
    ALTER TABLE public.topic_objectives RENAME TO topic_objective_links;
  END IF;
END $$;

-- Recreate trigger functions to reference new table names
DO $$
BEGIN
  IF to_regclass('public.topics') IS NOT NULL
     AND to_regclass('public.videos') IS NOT NULL THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.update_topic_video_count()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public'
      AS $function$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          IF NEW.is_active = true THEN
            UPDATE public.topics
            SET video_count = (
              SELECT COUNT(*) FROM public.videos
              WHERE topic_id = NEW.topic_id AND is_active = true
            )
            WHERE id = NEW.topic_id;
          END IF;
          RETURN NEW;
        END IF;

        IF TG_OP = 'DELETE' THEN
          UPDATE public.topics
          SET video_count = (
            SELECT COUNT(*) FROM public.videos
            WHERE topic_id = OLD.topic_id AND is_active = true
          )
          WHERE id = OLD.topic_id;
          RETURN OLD;
        END IF;

        IF TG_OP = 'UPDATE' THEN
          IF OLD.topic_id IS DISTINCT FROM NEW.topic_id THEN
            UPDATE public.topics
            SET video_count = (
              SELECT COUNT(*) FROM public.videos
              WHERE topic_id = OLD.topic_id AND is_active = true
            )
            WHERE id = OLD.topic_id;

            UPDATE public.topics
            SET video_count = (
              SELECT COUNT(*) FROM public.videos
              WHERE topic_id = NEW.topic_id AND is_active = true
            )
            WHERE id = NEW.topic_id;
          ELSIF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
            UPDATE public.topics
            SET video_count = (
              SELECT COUNT(*) FROM public.videos
              WHERE topic_id = NEW.topic_id AND is_active = true
            )
            WHERE id = NEW.topic_id;
          END IF;
          RETURN NEW;
        END IF;

        RETURN NULL;
      END;
      $function$;
    $fn$;
  END IF;

  IF to_regclass('public.topics') IS NOT NULL
     AND to_regclass('public.videos') IS NOT NULL
     AND to_regclass('public.video_quizzes') IS NOT NULL THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.update_topic_quiz_count()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public'
      AS $function$
      DECLARE
        v_topic_id UUID;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          SELECT topic_id INTO v_topic_id FROM public.videos WHERE id = OLD.video_id;
        ELSE
          SELECT topic_id INTO v_topic_id FROM public.videos WHERE id = NEW.video_id;
        END IF;

        IF v_topic_id IS NOT NULL THEN
          UPDATE public.topics
          SET quiz_count = (
            SELECT COUNT(*) FROM public.video_quizzes vq
            JOIN public.videos lv ON lv.id = vq.video_id
            WHERE lv.topic_id = v_topic_id AND lv.is_active = true
          )
          WHERE id = v_topic_id;
        END IF;

        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        END IF;
        RETURN NEW;
      END;
      $function$;
    $fn$;
  END IF;
END $$;
