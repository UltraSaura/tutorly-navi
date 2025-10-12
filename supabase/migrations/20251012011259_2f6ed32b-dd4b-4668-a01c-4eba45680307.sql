-- Allow guardians to view their children's exercise history
CREATE POLICY "Guardians can view children's exercise history"
ON public.exercise_history
FOR SELECT
USING (
  user_id IN (
    SELECT c.user_id
    FROM children c
    JOIN guardian_child_links gcl ON gcl.child_id = c.id
    JOIN guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
);

-- Allow guardians to view their children's exercise attempts
CREATE POLICY "Guardians can view children's attempts"
ON public.exercise_attempts
FOR SELECT
USING (
  (
    SELECT eh.user_id
    FROM exercise_history eh
    WHERE eh.id = exercise_attempts.exercise_history_id
  ) IN (
    SELECT c.user_id
    FROM children c
    JOIN guardian_child_links gcl ON gcl.child_id = c.id
    JOIN guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
);