-- Add structured parsing output for exam exercises.
-- Backward compatible: raw_text remains the source-of-truth fallback.

alter table public.exam_exercises
  add column if not exists parsed_content jsonb,
  add column if not exists parsing_confidence text;

-- Optional guardrail: only allow known confidence labels (but keep nullable).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exam_exercises_parsing_confidence_check'
  ) then
    alter table public.exam_exercises
      add constraint exam_exercises_parsing_confidence_check
      check (parsing_confidence is null or parsing_confidence in ('high', 'medium', 'low'));
  end if;
end $$;

-- Optional index for JSONB search/filtering in admin/debug tools.
create index if not exists idx_exam_exercises_parsed_content_gin
  on public.exam_exercises using gin (parsed_content);

