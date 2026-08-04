drop policy if exists "Admins can read AI model providers" on public.ai_model_providers;
drop policy if exists "Admins can read AI models" on public.ai_models;
drop policy if exists "Admins can read prompt templates" on public.prompt_templates;
drop policy if exists "Admins can read subject assignments" on public.subject_prompt_assignments;

revoke all on table public.admin_audit_log from anon;
revoke all on table public.ai_model_keys from anon;
revoke all on table public.ai_model_providers from anon;
revoke all on table public.ai_models from anon;
revoke all on table public.app_feature_flags from anon;
revoke all on table public.prompt_templates from anon;
revoke all on table public.subject_prompt_assignments from anon;
