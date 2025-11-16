-- Create objective-level mastery tracking table
CREATE TABLE objective_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES learning_topics(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'mastered')),
  score_percent INTEGER NOT NULL DEFAULT 0 CHECK (score_percent >= 0 AND score_percent <= 100),
  attempts_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  country_code TEXT,
  level_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one record per student per objective per topic
  UNIQUE(student_id, objective_id, topic_id)
);

-- Indexes for performance
CREATE INDEX idx_objective_mastery_student ON objective_mastery(student_id);
CREATE INDEX idx_objective_mastery_topic ON objective_mastery(topic_id);
CREATE INDEX idx_objective_mastery_objective ON objective_mastery(objective_id);
CREATE INDEX idx_objective_mastery_status ON objective_mastery(student_id, status);
CREATE INDEX idx_objective_mastery_curriculum ON objective_mastery(country_code, level_code);

-- RLS Policies
ALTER TABLE objective_mastery ENABLE ROW LEVEL SECURITY;

-- Students can view their own mastery
CREATE POLICY "Students can view own mastery"
ON objective_mastery FOR SELECT
USING (student_id = auth.uid());

-- Students can insert/update their own mastery
CREATE POLICY "Students can update own mastery"
ON objective_mastery FOR INSERT
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own mastery records"
ON objective_mastery FOR UPDATE
USING (student_id = auth.uid());

-- Guardians can view children's mastery
CREATE POLICY "Guardians can view children mastery"
ON objective_mastery FOR SELECT
USING (
  student_id IN (
    SELECT c.user_id FROM children c
    JOIN guardian_child_links gcl ON gcl.child_id = c.id
    JOIN guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
);

-- Admins can view all mastery
CREATE POLICY "Admins can view all mastery"
ON objective_mastery FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_objective_mastery_updated_at
BEFORE UPDATE ON objective_mastery
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE objective_mastery IS 'Tracks student mastery at the objective level within specific topics';
COMMENT ON COLUMN objective_mastery.score_percent IS 'Percentage score (0-100), calculated from task results';
COMMENT ON COLUMN objective_mastery.status IS 'not_started: no attempts; in_progress: 30-79%; mastered: 80%+';