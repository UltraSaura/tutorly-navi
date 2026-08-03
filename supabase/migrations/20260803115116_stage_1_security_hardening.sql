create table if not exists public.security_rate_limits (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  actor_key text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, actor_key, window_start)
);

alter table public.security_rate_limits enable row level security;

create index if not exists idx_security_rate_limits_scope_actor_window
  on public.security_rate_limits (scope, actor_key, window_start desc);

drop trigger if exists update_security_rate_limits_updated_at on public.security_rate_limits;
create trigger update_security_rate_limits_updated_at
before update on public.security_rate_limits
for each row
execute function public.update_updated_at_column();

create or replace function public.consume_security_rate_limit(
  p_scope text,
  p_actor_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  current_count integer,
  reset_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_current_count integer;
begin
  if p_scope is null or btrim(p_scope) = '' then
    raise exception 'scope is required';
  end if;

  if p_actor_key is null or btrim(p_actor_key) = '' then
    raise exception 'actor_key is required';
  end if;

  if p_limit is null or p_limit < 1 then
    raise exception 'limit must be >= 1';
  end if;

  if p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'window_seconds must be >= 1';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.security_rate_limits (scope, actor_key, window_start, request_count)
  values (p_scope, p_actor_key, v_window_start, 1)
  on conflict (scope, actor_key, window_start)
  do update set
    request_count = public.security_rate_limits.request_count + 1,
    updated_at = now()
  returning public.security_rate_limits.request_count
  into v_current_count;

  return query
  select
    v_current_count <= p_limit,
    v_current_count,
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.consume_security_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text, text, integer, integer) to service_role;

create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  scope text not null,
  event_type text not null,
  outcome text not null,
  actor_user_id uuid null references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.security_audit_events enable row level security;

create index if not exists idx_security_audit_events_scope_created_at
  on public.security_audit_events (scope, created_at desc);

create index if not exists idx_security_audit_events_actor_created_at
  on public.security_audit_events (actor_user_id, created_at desc);

alter table if exists public.quiz_bank_variants enable row level security;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'quiz_bank_variants'
  ) then
    execute 'drop policy if exists "Admins can manage quiz bank variants" on public.quiz_bank_variants';
    execute 'drop policy if exists "Authenticated users can read quiz bank variants" on public.quiz_bank_variants';
    execute 'create policy "Admins can manage quiz bank variants"
      on public.quiz_bank_variants
      for all
      to authenticated
      using (public.has_role(auth.uid(), ''admin''::public.app_role))
      with check (public.has_role(auth.uid(), ''admin''::public.app_role))';
  end if;
end
$$;

drop policy if exists "System can create explanations" on public.explanations_cache;
drop policy if exists "System can update explanations" on public.explanations_cache;
drop policy if exists "Authenticated can insert explanations" on public.explanations_cache;
drop policy if exists "Authenticated can update explanations" on public.explanations_cache;
drop policy if exists "Authenticated can delete explanations" on public.explanations_cache;

drop policy if exists "Guardians can view children explanations" on public.explanations_cache;
create policy "Guardians can view children explanations"
on public.explanations_cache
for select
to authenticated
using (
  attempt_id in (
    select ea.id
    from public.exercise_attempts ea
    inner join public.exercise_history eh on eh.id = ea.exercise_history_id
    inner join public.children c on c.user_id = eh.user_id
    inner join public.guardian_child_links gcl on gcl.child_id = c.id
    inner join public.guardians g on g.id = gcl.guardian_id
    where g.user_id = auth.uid()
  )
);

drop policy if exists "Admins can view all explanations" on public.explanations_cache;
create policy "Admins can view all explanations"
on public.explanations_cache
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Authenticated can insert exercise explanations cache" on public.exercise_explanations_cache;
drop policy if exists "Authenticated can update exercise explanations cache" on public.exercise_explanations_cache;
drop policy if exists "System can create exercise explanations cache" on public.exercise_explanations_cache;
drop policy if exists "System can update exercise explanations cache" on public.exercise_explanations_cache;

create policy "Admins can insert exercise explanations cache"
on public.exercise_explanations_cache
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can update exercise explanations cache"
on public.exercise_explanations_cache
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can delete exercise explanations cache"
on public.exercise_explanations_cache
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

revoke execute on function public.create_vault_secret(text, text) from public, anon, authenticated;
revoke execute on function public.get_model_with_fallback() from public, anon, authenticated;
grant execute on function public.get_model_with_fallback() to service_role;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.auto_create_guardian_profile() from public, anon, authenticated;
revoke execute on function public.auto_create_child_profile() from public, anon, authenticated;
revoke execute on function public.auto_assign_guardian_role() from public, anon, authenticated;
revoke execute on function public.auto_create_teacher_profile() from public, anon, authenticated;
revoke execute on function public.auto_assign_teacher_role() from public, anon, authenticated;
revoke execute on function public.update_topic_video_count() from public, anon, authenticated;
revoke execute on function public.update_topic_quiz_count() from public, anon, authenticated;
revoke execute on function public.update_app_feature_flags_updated_at() from public, anon, authenticated;

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
