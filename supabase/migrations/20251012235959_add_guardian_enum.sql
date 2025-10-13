-- Add guardian value to app_role enum
-- This must be in its own migration to avoid transaction issues

DO $$ 
BEGIN
    -- Check if the value already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'public.app_role'::regtype 
        AND enumlabel = 'guardian'
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'guardian';
    END IF;
END $$;

