DROP POLICY IF EXISTS "Guardians can view linked child learning interaction events"
  ON public.learning_interaction_events;
CREATE POLICY "Guardians can view linked child learning interaction events"
  ON public.learning_interaction_events
  FOR SELECT
  USING (
    student_id IN (
      SELECT children.user_id
      FROM public.guardian_child_links
      JOIN public.guardians
        ON guardians.id = guardian_child_links.guardian_id
      JOIN public.children
        ON children.id = guardian_child_links.child_id
      WHERE guardians.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can view class student learning interaction events"
  ON public.learning_interaction_events;
CREATE POLICY "Teachers can view class student learning interaction events"
  ON public.learning_interaction_events
  FOR SELECT
  USING (
    student_id IN (
      SELECT class_student_links.student_id
      FROM public.class_student_links
      JOIN public.classes
        ON classes.id = class_student_links.class_id
      JOIN public.teachers
        ON teachers.id = classes.teacher_id
      WHERE teachers.user_id = auth.uid()
    )
  );
