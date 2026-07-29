-- Backend/admin-only corrections for specific questions.
-- Extend-only: new table + RLS policies.

create table if not exists public.exam_question_corrections (
  id uuid primary key default gen_random_uuid(),
  exam_paper_id uuid references public.exam_papers(id) on delete cascade,
  exercise_id uuid references public.exam_exercises(id) on delete cascade,
  question_id text not null,
  correct_answer text,
  explanation_steps jsonb not null default '[]'::jsonb,
  source text not null default 'official',
  created_at timestamptz not null default now()
);

create index if not exists exam_question_corrections_idx
  on public.exam_question_corrections (exam_paper_id, question_id);

alter table public.exam_question_corrections enable row level security;

drop policy if exists "Admins can read exam question corrections" on public.exam_question_corrections;
create policy "Admins can read exam question corrections"
  on public.exam_question_corrections for select
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert exam question corrections" on public.exam_question_corrections;
create policy "Admins can insert exam question corrections"
  on public.exam_question_corrections for insert
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update exam question corrections" on public.exam_question_corrections;
create policy "Admins can update exam question corrections"
  on public.exam_question_corrections for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete exam question corrections" on public.exam_question_corrections;
create policy "Admins can delete exam question corrections"
  on public.exam_question_corrections for delete
  using (public.has_role(auth.uid(), 'admin'));

