-- Create students table
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,                    -- link to auth.user if you use Supabase Auth
  name text,
  level text not null,             -- CM1, CM2, 6e
  created_at timestamptz default now()
);

-- Create student_mastery table
create table if not exists student_mastery (
  id bigserial primary key,
  student_id uuid references students(id) on delete cascade,
  success_criterion_id text references success_criteria(id) on delete cascade,
  status text not null default 'not_started',  -- not_started, in_progress, mastered
  last_score numeric,
  last_attempt_at timestamptz,
  constraint uniq_student_sc unique (student_id, success_criterion_id)
);

-- Create quiz_attempts table
create table if not exists quiz_attempts (
  id bigserial primary key,
  student_id uuid references students(id) on delete cascade,
  task_id text references tasks(id) on delete cascade,
  success_criterion_id text,
  is_correct boolean,
  answer text,
  created_at timestamptz default now()
);

-- Create lesson_instances table
create table if not exists lesson_instances (
  id bigserial primary key,
  student_id uuid references students(id) on delete cascade,
  lesson_id text references lessons(id),
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Add indexes for better query performance
create index if not exists idx_student_mastery_student_id on student_mastery(student_id);
create index if not exists idx_student_mastery_success_criterion_id on student_mastery(success_criterion_id);
create index if not exists idx_quiz_attempts_student_id on quiz_attempts(student_id);
create index if not exists idx_quiz_attempts_task_id on quiz_attempts(task_id);
create index if not exists idx_quiz_attempts_success_criterion_id on quiz_attempts(success_criterion_id);
create index if not exists idx_lesson_instances_student_id on lesson_instances(student_id);
create index if not exists idx_lesson_instances_lesson_id on lesson_instances(lesson_id);
create index if not exists idx_students_user_id on students(user_id);

