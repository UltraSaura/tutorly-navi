-- School level attached to official exam papers.
-- Exercises inherit this through paper_id; training items keep their own denormalized level.

alter table public.exam_papers
  add column if not exists level text;

update public.exam_papers
set level = case
  when exam = 'dnb' then '3eme'
  when exam = 'bac' then 'terminale'
  when exam = 'bac_francais' then '1ere'
  when exam = 'cap' then 'cap'
  else level
end
where level is null;

create index if not exists exam_papers_level_idx
  on public.exam_papers (level);
