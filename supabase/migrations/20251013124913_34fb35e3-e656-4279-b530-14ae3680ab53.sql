-- Add unique index on usernames to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique 
ON public.users (username) 
WHERE username IS NOT NULL;