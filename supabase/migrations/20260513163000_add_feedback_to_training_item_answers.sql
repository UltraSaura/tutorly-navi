-- Extend-only: keep existing columns; add `feedback` as a normalized UI-facing field.

alter table public.training_item_answers
  add column if not exists feedback text;

