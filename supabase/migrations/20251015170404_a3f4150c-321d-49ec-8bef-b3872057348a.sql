-- Fix the incorrectly graded exercise data
UPDATE exercise_history
SET is_correct = false,
    updated_at = now()
WHERE id = '84a4c1d3-2a7f-457d-986a-25ef99fd48e8';

-- Fix the corresponding exercise_attempts record
UPDATE exercise_attempts
SET is_correct = false
WHERE exercise_history_id = '84a4c1d3-2a7f-457d-986a-25ef99fd48e8'
  AND user_answer = '20';