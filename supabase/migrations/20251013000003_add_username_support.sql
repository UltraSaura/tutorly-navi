-- Add username support to users table
-- This migration adds username column with unique constraint for username-based authentication

-- Add username column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index on username for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Add comment for documentation
COMMENT ON COLUMN public.users.username IS 'Unique username for login authentication (alternative to email)';
