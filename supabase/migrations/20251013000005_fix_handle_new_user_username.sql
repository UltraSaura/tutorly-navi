-- Fix handle_new_user function to handle NULL usernames properly
-- Parents don't have usernames, only children do, so username can be NULL

-- First, drop the existing unique constraint and recreate it to allow NULLs
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_username_key;

-- Create a partial unique index that only applies to non-NULL usernames
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_not_null ON public.users(username) WHERE username IS NOT NULL;

-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, user_type, first_name, last_name, country, phone_number, username) 
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'phone_number',
    NULLIF(NEW.raw_user_meta_data->>'username', '') -- Convert empty string to NULL
  );
  RETURN NEW;
END;
$$;
