alter table public.quiz_banks
  add column if not exists subject_id uuid references public.subjects(id) on delete set null,
  add column if not exists primary_topic_id uuid references public.topics(id) on delete set null,
  add column if not exists source_topic_ids uuid[] null,
  add column if not exists school_levels text[] null,
  add column if not exists source_language text null default 'en';

create table if not exists public.quiz_bank_variants (
  id uuid primary key default gen_random_uuid(),
  bank_id text not null references public.quiz_banks(id) on delete cascade,
  language text not null,
  title text not null,
  description text null,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bank_id, language)
);

create index if not exists idx_quiz_banks_subject_id on public.quiz_banks(subject_id);
create index if not exists idx_quiz_banks_primary_topic_id on public.quiz_banks(primary_topic_id);
create index if not exists idx_quiz_banks_source_language on public.quiz_banks(source_language);
create index if not exists idx_quiz_banks_school_levels_gin on public.quiz_banks using gin (school_levels);
create index if not exists idx_quiz_banks_source_topic_ids_gin on public.quiz_banks using gin (source_topic_ids);
create index if not exists idx_quiz_bank_variants_bank_language on public.quiz_bank_variants(bank_id, language);

create or replace function public.touch_quiz_bank_variant_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_quiz_bank_variant_updated_at on public.quiz_bank_variants;
create trigger trg_touch_quiz_bank_variant_updated_at
before update on public.quiz_bank_variants
for each row
execute function public.touch_quiz_bank_variant_updated_at();
