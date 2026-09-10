-- Additive migration for curriculum prerequisite relationships
-- Supports directed prerequisite edges (A -> B means A is prerequisite for B)
-- Cross-subject and non-destructive with RLS and indexes

CREATE TABLE IF NOT EXISTS public.curriculum_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  prerequisite_concept_id TEXT NOT NULL,
  target_concept_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'required' CHECK (relationship_type IN ('required', 'recommended', 'remedial')),
  strength INTEGER NOT NULL DEFAULT 1 CHECK (strength >= 1 AND strength <= 5),
  objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_curriculum_prerequisite_edge UNIQUE (prerequisite_concept_id, target_concept_id),
  CONSTRAINT chk_no_self_prerequisite CHECK (prerequisite_concept_id <> target_concept_id)
);

-- Indexes for efficient graph traversal and targeted lookups
CREATE INDEX IF NOT EXISTS idx_curriculum_prerequisites_target
  ON public.curriculum_prerequisites(target_concept_id);

CREATE INDEX IF NOT EXISTS idx_curriculum_prerequisites_prereq
  ON public.curriculum_prerequisites(prerequisite_concept_id);

CREATE INDEX IF NOT EXISTS idx_curriculum_prerequisites_subject
  ON public.curriculum_prerequisites(subject_id);

-- Enable Row Level Security
ALTER TABLE public.curriculum_prerequisites ENABLE ROW LEVEL SECURITY;

-- Read policy: Authenticated and anonymous users can read curriculum prerequisite graph
CREATE POLICY "Anyone can read curriculum prerequisites"
  ON public.curriculum_prerequisites
  FOR SELECT
  USING (true);

-- Write policies: Restrict direct client writes (managed via admin or migration/service role)
CREATE POLICY "Admins can insert curriculum prerequisites"
  ON public.curriculum_prerequisites
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update curriculum prerequisites"
  ON public.curriculum_prerequisites
  FOR UPDATE
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete curriculum prerequisites"
  ON public.curriculum_prerequisites
  FOR DELETE
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
