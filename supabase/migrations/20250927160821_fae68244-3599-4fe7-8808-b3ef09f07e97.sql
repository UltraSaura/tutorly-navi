-- Create AI model providers table
CREATE TABLE public.ai_model_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  api_base_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create AI models table
CREATE TABLE public.ai_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.ai_model_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model_id TEXT NOT NULL,
  context_window INTEGER,
  max_tokens INTEGER,
  pricing_input DECIMAL(10,6),
  pricing_output DECIMAL(10,6),
  capabilities TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(provider_id, model_id)
);

-- Create AI API keys table
CREATE TABLE public.ai_model_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.ai_model_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on all tables
ALTER TABLE public.ai_model_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_model_providers
CREATE POLICY "Allow admins to manage AI model providers"
ON public.ai_model_providers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.user_type = 'admin'
  )
);

CREATE POLICY "Allow users to view active AI model providers"
ON public.ai_model_providers
FOR SELECT
TO authenticated
USING (is_active = true);

-- RLS policies for ai_models
CREATE POLICY "Allow admins to manage AI models"
ON public.ai_models
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.user_type = 'admin'
  )
);

CREATE POLICY "Allow users to view active AI models"
ON public.ai_models
FOR SELECT
TO authenticated
USING (is_active = true);

-- RLS policies for ai_model_keys (restricted to admins only)
CREATE POLICY "Allow admins to manage AI model keys"
ON public.ai_model_keys
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.user_type = 'admin'
  )
);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_ai_model_providers_updated_at
  BEFORE UPDATE ON public.ai_model_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_models_updated_at
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_model_keys_updated_at
  BEFORE UPDATE ON public.ai_model_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default providers and models
INSERT INTO public.ai_model_providers (name, api_base_url) VALUES
  ('OpenAI', 'https://api.openai.com/v1'),
  ('DeepSeek', 'https://api.deepseek.com/v1'),
  ('Anthropic', 'https://api.anthropic.com/v1'),
  ('Google', 'https://generativelanguage.googleapis.com/v1beta'),
  ('Mistral', 'https://api.mistral.ai/v1'),
  ('xAI', 'https://api.x.ai/v1');

-- Insert default models for OpenAI
INSERT INTO public.ai_models (provider_id, name, model_id, context_window, max_tokens, capabilities) 
SELECT 
  p.id,
  'GPT-5',
  'gpt-5-2025-08-07',
  200000,
  16384,
  ARRAY['text', 'vision', 'reasoning']
FROM public.ai_model_providers p WHERE p.name = 'OpenAI';

INSERT INTO public.ai_models (provider_id, name, model_id, context_window, max_tokens, capabilities) 
SELECT 
  p.id,
  'GPT-5 Mini',
  'gpt-5-mini-2025-08-07',
  200000,
  16384,
  ARRAY['text', 'vision', 'fast']
FROM public.ai_model_providers p WHERE p.name = 'OpenAI';

INSERT INTO public.ai_models (provider_id, name, model_id, context_window, max_tokens, capabilities) 
SELECT 
  p.id,
  'GPT-4o',
  'gpt-4o',
  128000,
  4096,
  ARRAY['text', 'vision', 'legacy']
FROM public.ai_model_providers p WHERE p.name = 'OpenAI';

-- Insert default models for DeepSeek
INSERT INTO public.ai_models (provider_id, name, model_id, context_window, max_tokens, capabilities) 
SELECT 
  p.id,
  'DeepSeek Chat',
  'deepseek-chat',
  32000,
  4096,
  ARRAY['text', 'reasoning', 'cost-effective']
FROM public.ai_model_providers p WHERE p.name = 'DeepSeek';

-- Update user to admin (for the user to access admin panel)
UPDATE public.users 
SET user_type = 'admin' 
WHERE email IN ('hmtraore@ymail.com', 'hmtraore@gmail.com');