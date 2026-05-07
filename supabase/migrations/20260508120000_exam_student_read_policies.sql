-- Allow signed-in learners to read published exam papers and exercises (no writes).
-- Admins retain existing scoped policies; permissive SELECT policies compose with OR.

create policy "Authenticated users can read exam papers"
  on public.exam_papers for select
  to authenticated
  using (true);

create policy "Authenticated users can read exam exercises"
  on public.exam_exercises for select
  to authenticated
  using (true);
