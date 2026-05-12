-- Dedicated exam annals import tables.
-- These tables intentionally do not write to curriculum tables.

create table if not exists public.exam_sources (
  id uuid primary key,
  source_name text not null check (source_name in ('eduscol', 'ac-amiens-maths')),
  source_url text not null unique,
  fetched_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_papers (
  id uuid primary key,
  import_id text not null unique,
  source_id uuid references public.exam_sources(id) on delete set null,
  source_name text not null check (source_name in ('eduscol', 'ac-amiens-maths')),
  source_url text not null,
  fetched_at timestamptz not null,
  exam text not null,
  session_year integer not null,
  discipline text not null,
  series text check (series in ('generale', 'professionnelle')),
  location text not null,
  variant text not null check (variant in (
    'standard',
    'arial16',
    'arial20',
    'arial24',
    'braille_integral',
    'braille_abrege'
  )),
  title text,
  pdf_url text not null,
  pdf_hash text not null unique,
  raw_text text not null default '',
  parsing_status text not null check (parsing_status in ('parsed', 'partial', 'failed')),
  exercise_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_exercises (
  id uuid primary key,
  import_id text not null unique,
  paper_id uuid not null references public.exam_papers(id) on delete cascade,
  source_name text not null check (source_name in ('eduscol', 'ac-amiens-maths')),
  source_url text not null,
  fetched_at timestamptz not null,
  exam text not null,
  session_year integer not null,
  discipline text not null,
  series text check (series in ('generale', 'professionnelle')),
  location text not null,
  variant text not null check (variant in (
    'standard',
    'arial16',
    'arial20',
    'arial24',
    'braille_integral',
    'braille_abrege'
  )),
  pdf_url text not null,
  pdf_hash text not null,
  exercise_number integer,
  title text,
  raw_text text not null default '',
  parsing_status text not null check (parsing_status in ('parsed', 'partial', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_exercise_program_links (
  id uuid primary key,
  exercise_id uuid not null references public.exam_exercises(id) on delete cascade,
  exercise_import_id text not null,
  program_entry_id text not null,
  program_entry_type text not null check (program_entry_type in ('objective', 'success_criterion', 'topic', 'unknown')),
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  rationale text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exercise_id, program_entry_id, program_entry_type)
);

create index if not exists idx_exam_sources_source_name
  on public.exam_sources (source_name);

create index if not exists idx_exam_papers_exam
  on public.exam_papers (exam);
create index if not exists idx_exam_papers_session_year
  on public.exam_papers (session_year);
create index if not exists idx_exam_papers_discipline
  on public.exam_papers (discipline);
create index if not exists idx_exam_papers_series
  on public.exam_papers (series);
create index if not exists idx_exam_papers_variant
  on public.exam_papers (variant);
create index if not exists idx_exam_papers_lookup
  on public.exam_papers (exam, session_year, discipline, series, variant);

create index if not exists idx_exam_exercises_paper_id
  on public.exam_exercises (paper_id);
create index if not exists idx_exam_exercises_exam
  on public.exam_exercises (exam);
create index if not exists idx_exam_exercises_session_year
  on public.exam_exercises (session_year);
create index if not exists idx_exam_exercises_discipline
  on public.exam_exercises (discipline);
create index if not exists idx_exam_exercises_series
  on public.exam_exercises (series);
create index if not exists idx_exam_exercises_variant
  on public.exam_exercises (variant);
create index if not exists idx_exam_exercises_lookup
  on public.exam_exercises (exam, session_year, discipline, series, variant);

create index if not exists idx_exam_program_links_exercise_id
  on public.exam_exercise_program_links (exercise_id);
create index if not exists idx_exam_program_links_program_entry
  on public.exam_exercise_program_links (program_entry_id, program_entry_type);

alter table public.exam_sources enable row level security;
alter table public.exam_papers enable row level security;
alter table public.exam_exercises enable row level security;
alter table public.exam_exercise_program_links enable row level security;

create policy "Admins can read exam sources"
  on public.exam_sources for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read exam papers"
  on public.exam_papers for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read exam exercises"
  on public.exam_exercises for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read exam exercise program links"
  on public.exam_exercise_program_links for select
  using (public.has_role(auth.uid(), 'admin'));
