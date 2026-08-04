drop policy if exists "Allow users to view active prompt templates" on public.prompt_templates;

create policy "Admins can read prompt templates"
on public.prompt_templates
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));
