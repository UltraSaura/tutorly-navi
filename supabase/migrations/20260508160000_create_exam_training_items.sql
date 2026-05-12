-- Normalized pedagogical items derived from exam annals.
-- Source exam_* tables remain the official traceability layer.

create table if not exists public.exam_training_items (
  id uuid primary key,
  source_exercise_id uuid references public.exam_exercises(id) on delete set null,
  paper_id uuid references public.exam_papers(id) on delete set null,
  exam text not null,
  subject_slug text not null,
  level text not null,
  skill_tags text[] not null default '{}',
  curriculum_objective_ids uuid[],
  item_type text not null check (
    item_type in (
      'multiple_choice',
      'short_answer',
      'numeric',
      'free_response',
      'guided_problem',
      'document_question',
      'proof',
      'calculation'
    )
  ),
  prompt text not null,
  context text,
  documents jsonb not null default '[]'::jsonb,
  choices jsonb,
  expected_answer jsonb,
  solution text,
  hints jsonb,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  exam_style text,
  source_year integer,
  source_label text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exam_training_items_subject_slug
  on public.exam_training_items (subject_slug);
create index if not exists idx_exam_training_items_level
  on public.exam_training_items (level);
create index if not exists idx_exam_training_items_item_type
  on public.exam_training_items (item_type);
create index if not exists idx_exam_training_items_difficulty
  on public.exam_training_items (difficulty);
create index if not exists idx_exam_training_items_status
  on public.exam_training_items (status);
create index if not exists idx_exam_training_items_source_year
  on public.exam_training_items (source_year);
create index if not exists idx_exam_training_items_skill_tags_gin
  on public.exam_training_items using gin (skill_tags);

drop trigger if exists update_exam_training_items_updated_at on public.exam_training_items;
create trigger update_exam_training_items_updated_at
  before update on public.exam_training_items
  for each row
  execute function public.update_updated_at_column();

alter table public.exam_training_items enable row level security;

drop policy if exists "Students can read published exam training items" on public.exam_training_items;
create policy "Students can read published exam training items"
  on public.exam_training_items for select
  to authenticated
  using (status = 'published');

drop policy if exists "Admins can read all exam training items" on public.exam_training_items;
create policy "Admins can read all exam training items"
  on public.exam_training_items for select
  using (public.has_role(auth.uid(), 'admin'));
