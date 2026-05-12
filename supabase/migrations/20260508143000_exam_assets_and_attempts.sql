-- Visual assets and optional student attempts for imported exam annals.
-- This stays isolated from curriculum tables and task generation.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exam-assets', 'exam-assets', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.exam_assets (
  id uuid primary key,
  exercise_id uuid not null references public.exam_exercises(id) on delete cascade,
  paper_id uuid not null references public.exam_papers(id) on delete cascade,
  type text not null check (type in ('image', 'table', 'graph', 'text')),
  label text not null,
  storage_path text not null unique,
  public_url text,
  alt text,
  page_number integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exam_assets_exercise_id
  on public.exam_assets (exercise_id, sort_order);
create index if not exists idx_exam_assets_paper_id
  on public.exam_assets (paper_id);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid not null references public.exam_papers(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exam_attempts_user_id
  on public.exam_attempts (user_id, started_at desc);
create index if not exists idx_exam_attempts_paper_id
  on public.exam_attempts (paper_id);

create table if not exists public.exam_exercise_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  exercise_id uuid not null references public.exam_exercises(id) on delete cascade,
  question_id text not null,
  answer_text text,
  answer_json jsonb,
  is_correct boolean,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, exercise_id, question_id)
);

create index if not exists idx_exam_exercise_answers_attempt_id
  on public.exam_exercise_answers (attempt_id);
create index if not exists idx_exam_exercise_answers_exercise_id
  on public.exam_exercise_answers (exercise_id);

alter table public.exam_assets enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_exercise_answers enable row level security;

create policy "Authenticated users can read exam assets"
  on public.exam_assets for select
  to authenticated
  using (true);

create policy "Admins can read exam assets"
  on public.exam_assets for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Users can read own exam attempts"
  on public.exam_attempts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create own exam attempts"
  on public.exam_attempts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own exam attempts"
  on public.exam_attempts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read own exam answers"
  on public.exam_exercise_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.exam_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );

create policy "Users can create own exam answers"
  on public.exam_exercise_answers for insert
  to authenticated
  with check (
    exists (
      select 1 from public.exam_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );

create policy "Users can update own exam answers"
  on public.exam_exercise_answers for update
  to authenticated
  using (
    exists (
      select 1 from public.exam_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.exam_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );
