-- Update the handle_new_user trigger function to include username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    user_type, 
    first_name, 
    last_name, 
    country, 
    phone_number,
    username
  ) 
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'phone_number',
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      -- Fallback: generate username from email if not provided
      split_part(NEW.email, '@', 1) || '_' || substring(md5(random()::text) from 1 for 6)
    )
  );
  RETURN NEW;
END;
$function$;