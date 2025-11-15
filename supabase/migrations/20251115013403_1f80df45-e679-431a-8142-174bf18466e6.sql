-- Add curriculum location fields to objectives table
ALTER TABLE public.objectives
ADD COLUMN subject_id TEXT,
ADD COLUMN domain_id TEXT,
ADD COLUMN subdomain_id TEXT,
ADD COLUMN skill_id TEXT;

-- Add curriculum location fields to success_criteria table
ALTER TABLE public.success_criteria
ADD COLUMN subject_id TEXT,
ADD COLUMN domain_id TEXT,
ADD COLUMN subdomain_id TEXT,
ADD COLUMN skill_id TEXT;

-- Add curriculum location fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN subject_id TEXT,
ADD COLUMN domain_id TEXT,
ADD COLUMN subdomain_id TEXT,
ADD COLUMN skill_id TEXT;

-- Create indexes for better query performance
CREATE INDEX idx_objectives_subject ON public.objectives(subject_id);
CREATE INDEX idx_objectives_domain ON public.objectives(domain_id);
CREATE INDEX idx_objectives_subdomain ON public.objectives(subdomain_id);

CREATE INDEX idx_success_criteria_subject ON public.success_criteria(subject_id);
CREATE INDEX idx_success_criteria_domain ON public.success_criteria(domain_id);
CREATE INDEX idx_success_criteria_subdomain ON public.success_criteria(subdomain_id);

CREATE INDEX idx_tasks_subject ON public.tasks(subject_id);
CREATE INDEX idx_tasks_domain ON public.tasks(domain_id);
CREATE INDEX idx_tasks_subdomain ON public.tasks(subdomain_id);