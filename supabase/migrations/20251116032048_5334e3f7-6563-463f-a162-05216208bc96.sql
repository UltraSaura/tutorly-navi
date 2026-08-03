DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'learning_topics'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'objectives'
  ) THEN
    CREATE TABLE IF NOT EXISTS topic_objectives (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      topic_id UUID NOT NULL REFERENCES learning_topics(id) ON DELETE CASCADE,
      objective_id TEXT NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(topic_id, objective_id)
    );

    CREATE INDEX IF NOT EXISTS idx_topic_objectives_topic_id ON topic_objectives(topic_id);
    CREATE INDEX IF NOT EXISTS idx_topic_objectives_objective_id ON topic_objectives(objective_id);

    ALTER TABLE topic_objectives ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public can read topic objectives" ON topic_objectives;
    CREATE POLICY "Public can read topic objectives"
    ON topic_objectives FOR SELECT
    USING (true);

    DROP POLICY IF EXISTS "Admins can manage topic objectives" ON topic_objectives;
    CREATE POLICY "Admins can manage topic objectives"
    ON topic_objectives FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

    COMMENT ON TABLE topic_objectives IS 'Links learning topics to curriculum objectives (many-to-many)';
    COMMENT ON COLUMN topic_objectives.topic_id IS 'Reference to learning_topics table';
    COMMENT ON COLUMN topic_objectives.objective_id IS 'Reference to objectives table';
    COMMENT ON COLUMN topic_objectives.order_index IS 'Display order of objectives within a topic';
  END IF;
END $$;
