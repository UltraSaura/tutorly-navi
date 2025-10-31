-- Phase 1.1: Username Authentication System

-- Add username column (unique, case-insensitive)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username text;

-- Create case-insensitive unique index
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx 
ON public.users (LOWER(username));

-- Make email nullable for CHILD role (kids may not have email)
ALTER TABLE public.users 
ALTER COLUMN email DROP NOT NULL;

-- Drop unique constraint on email
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_email_key;

-- Add partial unique index (email unique only for non-student users)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_non_student 
ON public.users (email) 
WHERE user_type != 'student';

-- Add contact_email to users table for kids (parent's email)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS contact_email text;

-- Add username status tracking
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS username_set_at timestamp with time zone;

-- Backfill usernames for existing users (temp values, will be updated in app)
UPDATE public.users 
SET username = LOWER(CONCAT('user_', SUBSTRING(id::text FROM 1 FOR 8)))
WHERE username IS NULL;

-- Make username NOT NULL after backfill
ALTER TABLE public.users 
ALTER COLUMN username SET NOT NULL;