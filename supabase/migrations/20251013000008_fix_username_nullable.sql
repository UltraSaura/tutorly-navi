-- Fix username column to allow NULL values
-- Parents don't have usernames, only children do

-- Make username column nullable
ALTER TABLE public.users ALTER COLUMN username DROP NOT NULL;

-- Ensure the partial unique index exists for non-NULL usernames
DROP INDEX IF EXISTS users_username_unique_not_null;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_not_null ON public.users(username) WHERE username IS NOT NULL;
