CREATE POLICY "Guardians can delete their children"
ON public.children FOR DELETE TO authenticated
USING (id IN (
  SELECT gcl.child_id FROM guardian_child_links gcl
  JOIN guardians g ON g.id = gcl.guardian_id
  WHERE g.user_id = auth.uid()
));