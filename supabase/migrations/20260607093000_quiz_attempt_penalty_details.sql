ALTER TABLE public.quiz_bank_attempts
  ALTER COLUMN score TYPE NUMERIC USING score::NUMERIC;

ALTER TABLE public.quiz_bank_attempts
  ADD COLUMN IF NOT EXISTS details JSONB;
