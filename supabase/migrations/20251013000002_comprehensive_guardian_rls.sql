-- Comprehensive RLS policies for guardian access to children's data

-- ============================================================
-- EXERCISE HISTORY & ATTEMPTS
-- ============================================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Guardians can view children exercise history" ON public.exercise_history;
DROP POLICY IF EXISTS "Guardians can view children exercise attempts" ON public.exercise_attempts;

-- Guardian access to exercise history
CREATE POLICY "Guardians view children exercise history"
ON public.exercise_history FOR SELECT
TO authenticated
USING (
  -- User can view their own OR
  auth.uid() = user_id OR
  -- Guardian can view their children's
  user_id IN (
    SELECT c.user_id
    FROM public.children c
    INNER JOIN public.guardian_child_links gcl ON gcl.child_id = c.id
    INNER JOIN public.guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
);

-- Guardian access to exercise attempts
CREATE POLICY "Guardians view children exercise attempts"
ON public.exercise_attempts FOR SELECT
TO authenticated
USING (
  exercise_history_id IN (
    SELECT eh.id
    FROM public.exercise_history eh
    WHERE 
      eh.user_id = auth.uid() OR
      eh.user_id IN (
        SELECT c.user_id
        FROM public.children c
        INNER JOIN public.guardian_child_links gcl ON gcl.child_id = c.id
        INNER JOIN public.guardians g ON g.id = gcl.guardian_id
        WHERE g.user_id = auth.uid()
      )
  )
);

-- ============================================================
-- CHAT MESSAGES (if table exists)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Guardians can view children chat messages" ON public.chat_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Guardians view children chat messages" ON public.chat_messages';
    
    EXECUTE 'CREATE POLICY "Guardians view children chat messages"
    ON public.chat_messages FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id OR
      user_id IN (
        SELECT c.user_id
        FROM public.children c
        INNER JOIN public.guardian_child_links gcl ON gcl.child_id = c.id
        INNER JOIN public.guardians g ON g.id = gcl.guardian_id
        WHERE g.user_id = auth.uid()
      )
    )';
  END IF;
END $$;

-- ============================================================
-- USER PROFILES
-- ============================================================

-- Allow guardians to view their children's user profiles
DROP POLICY IF EXISTS "Guardians view children user profiles" ON public.users;
CREATE POLICY "Guardians view children user profiles"
ON public.users FOR SELECT
TO authenticated
USING (
  -- User can view their own OR
  auth.uid() = id OR
  -- Guardian can view their children's profiles
  id IN (
    SELECT c.user_id
    FROM public.children c
    INNER JOIN public.guardian_child_links gcl ON gcl.child_id = c.id
    INNER JOIN public.guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
);

-- ============================================================
-- EXERCISE EXPLANATIONS CACHE
-- ============================================================

-- Already has policy from previous migration, but let's ensure it's comprehensive
DROP POLICY IF EXISTS "Guardians can view children explanations" ON public.explanations_cache;
DROP POLICY IF EXISTS "Guardians view children explanations" ON public.explanations_cache;

CREATE POLICY "Guardians view children explanations"
ON public.explanations_cache FOR SELECT
TO authenticated
USING (
  attempt_id IN (
    SELECT ea.id 
    FROM public.exercise_attempts ea
    INNER JOIN public.exercise_history eh ON eh.id = ea.exercise_history_id
    WHERE 
      eh.user_id = auth.uid() OR
      eh.user_id IN (
        SELECT c.user_id 
        FROM public.children c
        INNER JOIN public.guardian_child_links gcl ON gcl.child_id = c.id
        INNER JOIN public.guardians g ON g.id = gcl.guardian_id
        WHERE g.user_id = auth.uid()
      )
  )
);

-- ============================================================
-- SUBJECTS & PROGRESS
-- ============================================================

-- If there's a user_subjects or progress tracking table, add policies
-- (Placeholder - add actual table name if exists)

-- ============================================================
-- HELPER FUNCTION FOR GUARDIAN CHECKS
-- ============================================================

-- Create a helper function to check if a user is a guardian of a child
CREATE OR REPLACE FUNCTION public.is_guardian_of_child(
  _guardian_user_id UUID,
  _child_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.children c
    INNER JOIN public.guardian_child_links gcl ON gcl.child_id = c.id
    INNER JOIN public.guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = _guardian_user_id
    AND c.user_id = _child_user_id
  );
$$;

COMMENT ON FUNCTION public.is_guardian_of_child(UUID, UUID) IS 'Helper function to check if a user is the guardian of a specific child';

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Add indexes to improve query performance for guardian lookups
CREATE INDEX IF NOT EXISTS idx_guardian_child_links_guardian_id 
ON public.guardian_child_links(guardian_id);

CREATE INDEX IF NOT EXISTS idx_guardian_child_links_child_id 
ON public.guardian_child_links(child_id);

CREATE INDEX IF NOT EXISTS idx_children_user_id 
ON public.children(user_id);

CREATE INDEX IF NOT EXISTS idx_guardians_user_id 
ON public.guardians(user_id);

CREATE INDEX IF NOT EXISTS idx_exercise_history_user_id 
ON public.exercise_history(user_id);

CREATE INDEX IF NOT EXISTS idx_exercise_attempts_history_id 
ON public.exercise_attempts(exercise_history_id);

