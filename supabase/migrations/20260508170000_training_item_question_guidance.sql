alter table public.exam_training_items
  add column if not exists questions jsonb not null default '[]'::jsonb;

create table if not exists public.training_item_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null references public.exam_training_items(id) on delete cascade,
  question_id text not null,
  answer_text text not null default '',
  hint_level integer not null default 0,
  guidance_feedback text,
  is_correct boolean,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_training_item_answers_item_question
  on public.training_item_answers (item_id, question_id);
create index if not exists idx_training_item_answers_user_submitted
  on public.training_item_answers (user_id, submitted_at desc);

alter table public.training_item_answers enable row level security;

drop policy if exists "Students can insert their own training item answers" on public.training_item_answers;
create policy "Students can insert their own training item answers"
  on public.training_item_answers for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Students can read their own training item answers" on public.training_item_answers;
create policy "Students can read their own training item answers"
  on public.training_item_answers for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can read training item answers" on public.training_item_answers;
create policy "Admins can read training item answers"
  on public.training_item_answers for select
  using (public.has_role(auth.uid(), 'admin'));
