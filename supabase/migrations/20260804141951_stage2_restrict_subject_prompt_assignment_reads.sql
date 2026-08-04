drop policy if exists "Allow users to view subject assignments" on public.subject_prompt_assignments;

create policy "Admins can read subject assignments"
on public.subject_prompt_assignments
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));
