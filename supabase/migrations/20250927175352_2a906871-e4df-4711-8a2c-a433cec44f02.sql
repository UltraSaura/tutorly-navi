-- CRITICAL SECURITY FIXES

-- 1. Add RLS policy for ai_model_keys table (CRITICAL)
-- Currently this table has no RLS policies, exposing API keys to unauthorized access
CREATE POLICY "Allow only admin users to manage AI model keys" 
ON public.ai_model_keys 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.user_type = 'admin'
  )
);

-- 2. Fix exercise_explanations_cache RLS policy (HIGH)
-- Currently publicly readable, should be limited to authenticated users
DROP POLICY IF EXISTS "Users can view exercise explanations cache" ON public.exercise_explanations_cache;
CREATE POLICY "Authenticated users can view exercise explanations cache" 
ON public.exercise_explanations_cache 
FOR SELECT 
TO authenticated 
USING (true);

-- 3. Fix database functions security (MEDIUM)
-- Add proper search_path to prevent injection attacks
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.users (id, email, user_type, first_name, last_name, country, phone_number) 
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'phone_number'
  );
  RETURN NEW;
END;
$function$;