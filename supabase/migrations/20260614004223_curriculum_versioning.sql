do $$
begin
  create type public.subject_code as enum ('francais', 'mathematiques');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.class_level as enum (
    'CP',
    'CE1',
    'CE2',
    'CM1',
    'CM2',
    '6e',
    '5e',
    '4e',
    '3e',
    '2nde',
    '1re',
    'terminale'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.edition_status as enum ('projet', 'active', 'superseded');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.applicability_status as enum ('en_vigueur', 'transitoire', 'planifie');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.content_source as enum ('official', 'generated');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.curriculum_edition (
  id uuid primary key default gen_random_uuid(),
  subject public.subject_code not null,
  cycle text not null,
  bo_reference text not null,
  bo_url text,
  source_pdf_url text,
  published_at date,
  status public.edition_status not null default 'active',
  content_hash text,
  ingested_at timestamptz,
  created_at timestamptz not null default now(),
  constraint curriculum_edition_subject_cycle_bo_reference_key
    unique (subject, cycle, bo_reference)
);

create table if not exists public.curriculum_applicability (
  id uuid primary key default gen_random_uuid(),
  level public.class_level not null,
  subject public.subject_code not null,
  school_year text not null,
  track text null,
  edition_id uuid not null references public.curriculum_edition(id) on delete restrict,
  status public.applicability_status not null,
  valid_from date not null,
  valid_until date null,
  created_at timestamptz not null default now(),
  constraint curriculum_applicability_level_subject_school_year_track_key
    unique nulls not distinct (level, subject, school_year, track)
);

create index if not exists idx_curriculum_applicability_subject_level_year
  on public.curriculum_applicability (subject, level, school_year);

alter table public.domains
  add column if not exists edition_id uuid references public.curriculum_edition(id) on delete set null;

alter table public.success_criteria
  add column if not exists source public.content_source not null default 'official';

alter table public.lessons
  add column if not exists edition_id uuid references public.curriculum_edition(id) on delete set null,
  add column if not exists bo_reference text;

create index if not exists idx_domains_edition_id
  on public.domains (edition_id);

create index if not exists idx_lessons_edition_id
  on public.lessons (edition_id);

create or replace function public.current_school_year(ref_date date default current_date)
returns text
language sql
stable
as $$
  select case
    when extract(month from ref_date)::int >= 9 then
      extract(year from ref_date)::int || '-' || (extract(year from ref_date)::int + 1)
    else
      (extract(year from ref_date)::int - 1) || '-' || extract(year from ref_date)::int
  end;
$$;

create or replace function public.resolve_edition(
  p_level public.class_level,
  p_subject public.subject_code,
  p_track text default null,
  p_date date default current_date
)
returns uuid
language sql
stable
as $$
  select ca.edition_id
  from public.curriculum_applicability ca
  join public.curriculum_edition ce
    on ce.id = ca.edition_id
    and ce.status = 'active'
  where ca.level = p_level
    and ca.subject = p_subject
    and ca.school_year = public.current_school_year(p_date)
    and ca.track is not distinct from p_track
    and ca.valid_from <= p_date
    and (ca.valid_until is null or ca.valid_until >= p_date)
  order by ca.valid_from desc
  limit 1;
$$;

alter table public.curriculum_edition enable row level security;
alter table public.curriculum_applicability enable row level security;

create policy curriculum_edition_read
  on public.curriculum_edition
  for select
  to authenticated, anon
  using (true);

create policy curriculum_applicability_read
  on public.curriculum_applicability
  for select
  to authenticated, anon
  using (true);
