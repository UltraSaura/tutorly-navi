-- Create student mastery tracking tables

-- Student mastery table
create table if not exists student_mastery (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade not null,
  success_criterion_id text references success_criteria(id) on delete cascade not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'mastered')),
  mastery_score numeric check (mastery_score >= 0 and mastery_score <= 100),
  attempts_count integer default 0,
  first_attempt_at timestamptz,
  last_attempt_at timestamptz,
  mastered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_child_sc unique (child_id, success_criterion_id)
);

-- Curriculum task attempts table
create table if not exists curriculum_task_attempts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade not null,
  task_id text references tasks(id) on delete cascade not null,
  success_criterion_id text references success_criteria(id),
  objective_id text references objectives(id),
  is_correct boolean,
  answer_data jsonb,
  time_spent_seconds integer,
  created_at timestamptz default now()
);

-- Lesson sessions table
create table if not exists lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade not null,
  lesson_id text references lessons(id),
  objective_ids jsonb,
  success_criterion_ids jsonb,
  duration_minutes integer,
  completion_percentage integer check (completion_percentage >= 0 and completion_percentage <= 100),
  started_at timestamptz default now(),
  completed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table student_mastery enable row level security;
alter table curriculum_task_attempts enable row level security;
alter table lesson_sessions enable row level security;

-- RLS Policies for student_mastery
create policy "Children can view own mastery"
  on student_mastery for select
  using (child_id in (
    select id from children where user_id = auth.uid()
  ));

create policy "Guardians can view children mastery"
  on student_mastery for select
  using (child_id in (
    select gcl.child_id
    from guardian_child_links gcl
    join guardians g on g.id = gcl.guardian_id
    where g.user_id = auth.uid()
  ));

create policy "System can manage mastery"
  on student_mastery for all
  using (true);

-- RLS Policies for curriculum_task_attempts
create policy "Children can view own attempts"
  on curriculum_task_attempts for select
  using (child_id in (
    select id from children where user_id = auth.uid()
  ));

create policy "Guardians can view children attempts"
  on curriculum_task_attempts for select
  using (child_id in (
    select gcl.child_id
    from guardian_child_links gcl
    join guardians g on g.id = gcl.guardian_id
    where g.user_id = auth.uid()
  ));

create policy "System can insert attempts"
  on curriculum_task_attempts for insert
  with check (true);

create policy "Admins can manage attempts"
  on curriculum_task_attempts for all
  using (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for lesson_sessions
create policy "Children can view own sessions"
  on lesson_sessions for select
  using (child_id in (
    select id from children where user_id = auth.uid()
  ));

create policy "Guardians can view children sessions"
  on lesson_sessions for select
  using (child_id in (
    select gcl.child_id
    from guardian_child_links gcl
    join guardians g on g.id = gcl.guardian_id
    where g.user_id = auth.uid()
  ));

create policy "System can manage sessions"
  on lesson_sessions for all
  using (true);

-- Create indexes for performance
create index idx_student_mastery_child on student_mastery(child_id);
create index idx_student_mastery_status on student_mastery(child_id, status);
create index idx_student_mastery_sc on student_mastery(success_criterion_id);

create index idx_task_attempts_child on curriculum_task_attempts(child_id);
create index idx_task_attempts_task on curriculum_task_attempts(task_id);
create index idx_task_attempts_created on curriculum_task_attempts(created_at desc);

create index idx_lesson_sessions_child on lesson_sessions(child_id);
create index idx_lesson_sessions_lesson on lesson_sessions(lesson_id);

-- Add updated_at trigger for student_mastery
create trigger update_student_mastery_updated_at
  before update on student_mastery
  for each row
  execute function update_updated_at_column();