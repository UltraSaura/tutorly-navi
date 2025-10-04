-- Fix API key security by adding explicit SELECT policy
-- Replace the generic ALL policy with specific operation policies for clarity

-- Drop the existing ALL policy
DROP POLICY IF EXISTS "Only admins with role can manage AI model keys" ON public.ai_model_keys;

-- Create explicit SELECT policy (this is what was missing)
CREATE POLICY "Only admins can view API keys"
ON public.ai_model_keys
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create explicit INSERT policy
CREATE POLICY "Only admins can insert API keys"
ON public.ai_model_keys
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create explicit UPDATE policy
CREATE POLICY "Only admins can update API keys"
ON public.ai_model_keys
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create explicit DELETE policy
CREATE POLICY "Only admins can delete API keys"
ON public.ai_model_keys
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));