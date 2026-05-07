CREATE POLICY "Guardians can update their children user profiles"
ON public.users
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT c.user_id
    FROM children c
    JOIN guardian_child_links gcl ON gcl.child_id = c.id
    JOIN guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT c.user_id
    FROM children c
    JOIN guardian_child_links gcl ON gcl.child_id = c.id
    JOIN guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
);