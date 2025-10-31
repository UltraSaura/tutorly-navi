-- Add RLS policies for admins to manage learning content

-- Subjects
CREATE POLICY "Admins can manage subjects"
ON public.learning_subjects FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Categories
CREATE POLICY "Admins can manage categories"
ON public.learning_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Topics
CREATE POLICY "Admins can manage topics"
ON public.learning_topics FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Videos
CREATE POLICY "Admins can manage videos"
ON public.learning_videos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Quizzes
CREATE POLICY "Admins can manage quizzes"
ON public.video_quizzes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));