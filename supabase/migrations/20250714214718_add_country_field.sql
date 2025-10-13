-- Add country field to users table (for parent information)
-- The country field already exists but this ensures it's properly configured for parents

-- Update the handle_new_user function to include parent country from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$function$;