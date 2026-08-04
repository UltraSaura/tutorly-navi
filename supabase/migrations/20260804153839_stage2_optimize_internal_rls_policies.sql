drop policy if exists "Only admins can view API keys" on public.ai_model_keys;
create policy "Only admins can view API keys"
on public.ai_model_keys
for select
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Only admins can insert API keys" on public.ai_model_keys;
create policy "Only admins can insert API keys"
on public.ai_model_keys
for insert
to authenticated
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Only admins can update API keys" on public.ai_model_keys;
create policy "Only admins can update API keys"
on public.ai_model_keys
for update
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Only admins can delete API keys" on public.ai_model_keys;
create policy "Only admins can delete API keys"
on public.ai_model_keys
for delete
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Only admins with role can manage AI model providers" on public.ai_model_providers;
create policy "Only admins with role can manage AI model providers"
on public.ai_model_providers
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Only admins with role can manage AI models" on public.ai_models;
create policy "Only admins with role can manage AI models"
on public.ai_models
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Admins can manage app feature flags" on public.app_feature_flags;
create policy "Admins can manage app feature flags"
on public.app_feature_flags
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Only admins with role can manage prompt templates" on public.prompt_templates;
create policy "Only admins with role can manage prompt templates"
on public.prompt_templates
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Only admins with role can manage subject assignments" on public.subject_prompt_assignments;
create policy "Only admins with role can manage subject assignments"
on public.subject_prompt_assignments
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Admins can view audit logs" on public.admin_audit_log;
create policy "Admins can view audit logs"
on public.admin_audit_log
for select
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Admins can insert audit logs" on public.admin_audit_log;
create policy "Admins can insert audit logs"
on public.admin_audit_log
for insert
to authenticated
with check (
  admin_id = (select auth.uid())
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
);

drop policy if exists "Guardians can view children audit logs" on public.admin_audit_log;
create policy "Guardians can view children audit logs"
on public.admin_audit_log
for select
to authenticated
using (
  target_id in (
    select c.user_id
    from public.children c
    join public.guardian_child_links gcl on gcl.child_id = c.id
    join public.guardians g on g.id = gcl.guardian_id
    where g.user_id = (select auth.uid())
  )
);

drop policy if exists "Guardians can view their own audit logs" on public.admin_audit_log;
create policy "Guardians can view their own audit logs"
on public.admin_audit_log
for select
to authenticated
using (admin_id = (select auth.uid()));
