create table public.topic_lesson_versions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete restrict,
  lesson_content jsonb not null,
  status text not null default 'draft'
    check (status in ('draft', 'validated', 'published', 'rejected')),
  created_by uuid not null default auth.uid()
    references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index topic_lesson_versions_topic_id_idx
  on public.topic_lesson_versions(topic_id);

create index topic_lesson_versions_status_idx
  on public.topic_lesson_versions(status);

alter table public.topic_lesson_versions enable row level security;

revoke all on public.topic_lesson_versions from anon;
grant select, insert, update, delete
  on public.topic_lesson_versions to authenticated;

create policy "Admins can read lesson versions"
  on public.topic_lesson_versions
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can create lesson versions"
  on public.topic_lesson_versions
  for insert to authenticated
  with check (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    and created_by = auth.uid()
  );

create policy "Admins can update lesson versions"
  on public.topic_lesson_versions
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can delete lesson versions"
  on public.topic_lesson_versions
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
