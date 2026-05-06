-- Corrective seed for grouped retry-practice prompt management.
-- This is intentionally idempotent so environments that missed the first seed
-- can safely receive the editable Supabase prompt later.
DO $$
DECLARE
  constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'prompt_templates'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%usage_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.prompt_templates DROP CONSTRAINT %I', constraint_record.conname);
  END LOOP;

  ALTER TABLE public.prompt_templates
    ADD CONSTRAINT prompt_templates_usage_type_check
    CHECK (usage_type IN ('chat', 'grading', 'explanation', 'math_enhanced', 'grouped_retry_practice'));
END $$;

INSERT INTO public.prompt_templates (
  name,
  description,
  prompt_content,
  subject,
  usage_type,
  is_active,
  auto_activate,
  priority,
  tags
) VALUES (
  'Grouped Retry Practice Explanation',
  'Creates TwoCard-style teaching explanations for one selected row in grouped homework problems.',
  $prompt$You are creating an "Explication" for ONE selected row in a grouped homework problem.
Return ONLY valid JSON. Do not use markdown fences. Do not include prose outside JSON.

Teaching goal:
- Create a specialized TwoCard-style teaching response, not a correction sheet.
- Teach the transferable idea behind the selected/evaluated row so the student can retry the original exercise independently.
- Adapt vocabulary, explanation length, and examples to the provided profile: school level, country/curriculum, learning style, and response language.
- Use warm, student-friendly language. Be concrete and concise.

Required teaching sequence:
- concept: explain the underlying idea in student-friendly language. Do not state the original answer.
- similarProblem: create ONE structurally similar worked example using changed numbers or a different concrete context. It must practice the same concept but must not copy the original wording or values.
- diagram: if problemContext.wantsDiagram is true or the selected row is geometry, include a simple structured diagram spec for the similar example. The labels and dimensions must match the similarProblem. For non-geometry rows, omit diagram or set it to null. Do not draw SVG or return markdown images.
- method: solve the similarProblem only, step by step. Explain why each step is done, not just the calculation.
- commonMistake: name the likely misconception or trap and how to avoid it.
- retryPrompt: invite the student to return to their original exercise and apply the same method without revealing the original final answer.
- parentHelpHint: give a short guardian-facing hint, but do not address it to the student.

Strict privacy and learning rules:
- Do NOT copy the exact original exercise text.
- Do NOT reuse numbers, expressions, dimensions, labels, or concrete examples from the original selected row or shared context.
- Do NOT reveal, mention, evaluate, correct, or explain unselected rows.
- Do NOT solve the original row directly.
- Do NOT give the original exercise's final answer as the teaching content.
- Do NOT tell the student whether their original answer is correct inside this teaching response.
- Keep all teaching content focused on the similar example and transferable method.

Return exactly this JSON shape:
{
  "concept": "student-friendly explanation of the underlying idea, not the original answer",
  "similarProblem": "one structurally similar worked example with changed numbers/context",
  "diagram": {
    "type": "rectangle|square|triangle|circle",
    "labels": ["A", "B", "C", "D"],
    "dimensions": { "bottom": "6 cm", "left": "3 cm" },
    "caption": "optional short caption"
  },
  "method": "step-by-step reasoning for the similar problem only, including why each step is done",
  "retryPrompt": "short prompt encouraging the student to retry the original exercise without revealing its answer",
  "commonMistake": "likely misconception or trap and how to avoid it",
  "parentHelpHint": "optional short guardian guidance, not for display in the student app"
}$prompt$,
  'Math',
  'grouped_retry_practice',
  true,
  true,
  100,
  ARRAY['grouped-problem', 'twocard', 'retry-practice']
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_content = EXCLUDED.prompt_content,
  subject = EXCLUDED.subject,
  usage_type = EXCLUDED.usage_type,
  is_active = EXCLUDED.is_active,
  auto_activate = EXCLUDED.auto_activate,
  priority = EXCLUDED.priority,
  tags = EXCLUDED.tags,
  updated_at = NOW();
