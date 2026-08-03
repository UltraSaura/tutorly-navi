-- Adds a GIN index for fast querying on structured `questions`.
-- Column already exists via prior migrations; this is extend-only.

create index if not exists exam_training_items_questions_idx
  on public.exam_training_items using gin (questions);

