drop policy if exists "Allow users to view active AI model providers" on public.ai_model_providers;

create policy "Admins can read AI model providers"
on public.ai_model_providers
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Allow users to view active AI models" on public.ai_models;

create policy "Admins can read AI models"
on public.ai_models
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));
