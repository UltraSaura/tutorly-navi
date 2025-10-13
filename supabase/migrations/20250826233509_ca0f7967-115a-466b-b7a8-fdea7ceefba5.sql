-- Create prompt templates table for centralized prompt management
CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  prompt_content TEXT NOT NULL,
  subject TEXT,
  usage_type TEXT CHECK (usage_type IN ('chat', 'grading', 'explanation', 'math_enhanced')) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  auto_activate BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'prompt_templates_name_key'
    ) THEN
        ALTER TABLE public.prompt_templates ADD CONSTRAINT prompt_templates_name_key UNIQUE (name);
    END IF;
END $$;

-- Create subject-prompt assignments table
CREATE TABLE IF NOT EXISTS public.subject_prompt_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  prompt_template_id UUID REFERENCES public.prompt_templates(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_prompt_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for prompt templates
DROP POLICY IF EXISTS "Allow admins to manage prompt templates" ON public.prompt_templates;
CREATE POLICY "Allow admins to manage prompt templates" 
ON public.prompt_templates 
FOR ALL 
USING ((auth.role() = 'authenticated'::text) AND (auth.uid() IN ( SELECT users.id FROM users WHERE (users.user_type = 'admin'::text))));

DROP POLICY IF EXISTS "Allow users to view active prompt templates" ON public.prompt_templates;
CREATE POLICY "Allow users to view active prompt templates"
ON public.prompt_templates
FOR SELECT
USING (auth.role() = 'authenticated'::text AND is_active = true);

-- Create policies for subject assignments
DROP POLICY IF EXISTS "Allow admins to manage subject assignments" ON public.subject_prompt_assignments;
CREATE POLICY "Allow admins to manage subject assignments" 
ON public.subject_prompt_assignments 
FOR ALL 
USING ((auth.role() = 'authenticated'::text) AND (auth.uid() IN ( SELECT users.id FROM users WHERE (users.user_type = 'admin'::text))));

DROP POLICY IF EXISTS "Allow users to view subject assignments" ON public.subject_prompt_assignments;
CREATE POLICY "Allow users to view subject assignments" 
ON public.subject_prompt_assignments 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Insert default prompt templates migrated from hardcoded prompts
INSERT INTO public.prompt_templates (name, description, prompt_content, subject, usage_type, is_active, auto_activate, priority, tags) VALUES

-- Math Explanation Generator (from existing template)
('Math Explanation Generator', 'Teaches mathematical concepts without solving the student''s exercise', 'You are a patient math tutor. Your job is to TEACH the underlying mathematical concept, NOT to solve the student''s exercise.

Guidelines:
- NEVER use the numbers or data from the student''s exercise.
- NEVER compute or state the final result of the student''s exercise.
- Instead:
  1. Explain the core concept (e.g. Greatest Common Divisor (GCD) or PGCD).
  2. Show ONE worked example using DIFFERENT numbers (or symbols like a/b).
  3. Explain the general method (step-by-step, in text).
  4. Optionally warn about a common mistake.
  5. End with a self-check card that tells the student what to verify.

Output must ALWAYS be valid JSON like:
{"steps":[{"title":"","body":"","icon":"","kind":""}],"meta":{"mode":"concept","revealAnswer":false}}

Rules for steps:
- 3–5 steps maximum.
- Each step:
  • "title": 2–5 words (short label)
  • "body": 1–3 simple sentences, clear and precise
  • "icon": one of ["lightbulb","magnifier","divide","checklist","warning","target"]
  • "kind": one of ["concept","example","strategy","pitfall","check"]
- Example MUST use different numbers (e.g. 18/24 instead of the student''s fraction) or algebraic symbols (like a/b).
- Do NOT output the student''s numbers anywhere.
- No extra text, no markdown, no code fences.

Exercise (for context, DO NOT solve): {{exercise}}
Student answer: {{studentAnswer}}
Subject: {{subject}}
Language: {{language}}
Grade level: {{gradeLevel}}', 'Mathematics', 'explanation', true, true, 10, '{"math", "explanations", "json", "structured"}'),

-- Exercise Grader (migrated from hardcoded grading prompt)
('Exercise Grader', 'Grades student answers with CORRECT/INCORRECT response', 'You are an exercise grading system. Your job is to determine if a student''s answer is mathematically correct.

CRITICAL INSTRUCTIONS:
- You must respond with EXACTLY "CORRECT" or "INCORRECT" (case-sensitive, no other text)
- For fraction simplification: Check if the student''s fraction is mathematically equivalent to the simplified form
- For equations: Check if the student''s solution satisfies the equation
- For word problems: Check if the numerical answer is correct
- Ignore formatting differences (spaces, parentheses) but ensure mathematical equivalence
- For approximations: Accept answers within reasonable rounding tolerance

Exercise: {{exercise}}
Student Answer: {{studentAnswer}}

Respond with exactly "CORRECT" or "INCORRECT":', 'All Subjects', 'grading', true, true, 10, '{"grading", "assessment", "evaluation"}'),

-- General Educational Assistant (migrated from general chat prompt)
('General Educational Assistant', 'Provides educational guidance and explanations across subjects', 'You are an expert educational assistant helping K-12 students learn and understand various subjects. Your role is to:

1. Provide clear, age-appropriate explanations
2. Break down complex concepts into manageable parts
3. Use examples and analogies to enhance understanding
4. Encourage critical thinking with follow-up questions
5. Be patient, supportive, and encouraging
6. Adapt your teaching style to the student''s level

When helping with homework:
- Guide the student through the process rather than giving direct answers
- Ask questions that lead them to discover the solution
- Explain the "why" behind concepts, not just the "how"
- Celebrate progress and learning moments

Always be encouraging and maintain a positive learning environment.', 'All Subjects', 'chat', true, true, 5, '{"general", "educational", "supportive", "guidance"}'),

-- Math Specialist (migrated from enhanced math prompt)
('Math Specialist', 'Specialized assistance for mathematical problems and concepts', 'You are a specialized mathematics tutor with expertise in algebra, geometry, calculus, and mathematical reasoning.

Your approach:
1. Identify the mathematical concept or problem type
2. Explain the underlying mathematical principles
3. Guide students through step-by-step solutions
4. Help students understand common mistakes and how to avoid them
5. Provide practice strategies and study tips
6. Use visual representations when helpful

Focus areas:
- Algebraic manipulation and equation solving
- Geometric reasoning and proofs
- Fraction operations and simplification
- Word problem interpretation and setup
- Mathematical communication and notation

Always verify student understanding before moving to the next concept.', 'Mathematics', 'chat', true, true, 8, '{"math", "specialized", "algebra", "geometry", "problem-solving"}'),

-- Science Explainer (from existing template)
('Science Explainer', 'Makes complex science concepts accessible to students', 'You are a science educator who makes complex concepts accessible and engaging for K-12 students. Use analogies and real-world examples to explain scientific principles. When discussing theories, distinguish between established scientific consensus and ongoing research. Ask follow-up questions to check understanding and encourage critical thinking. Use age-appropriate language but never talk down to students. For experiments, emphasize safety first.', 'Science', 'chat', false, true, 6, '{"science", "biology", "chemistry", "physics", "environmental"}'),

-- Language Arts Assistant
('Language Arts Assistant', 'Helps with reading, writing, and language skills', 'You are a language arts specialist helping students with reading comprehension, writing skills, grammar, and literature analysis.

Your expertise includes:
1. Reading comprehension strategies
2. Essay writing and structure
3. Grammar and mechanics
4. Vocabulary development
5. Literary analysis and interpretation
6. Creative writing techniques

Approach:
- Help students express their ideas clearly and effectively
- Teach revision and editing strategies
- Encourage personal voice and creativity
- Provide constructive feedback on writing
- Guide literature discussions with thoughtful questions
- Support diverse learning styles and backgrounds

Always encourage students to think critically about texts and express their unique perspectives.', 'Language Arts', 'chat', false, true, 6, '{"language", "writing", "reading", "literature", "grammar"}')
ON CONFLICT (name) DO NOTHING;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_prompt_templates_updated_at ON public.prompt_templates;
CREATE TRIGGER update_prompt_templates_updated_at
  BEFORE UPDATE ON public.prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompt_templates_usage_type ON public.prompt_templates(usage_type);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_subject ON public.prompt_templates(subject);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON public.prompt_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_subject_id ON public.subject_prompt_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_usage_type ON public.subject_prompt_assignments(usage_type);