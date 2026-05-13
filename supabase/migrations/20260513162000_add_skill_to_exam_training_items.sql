-- Adds a primary `skill` label (keep existing `skill_tags` array untouched).

alter table public.exam_training_items
  add column if not exists skill text;

create index if not exists exam_training_items_skill_idx
  on public.exam_training_items (skill);

