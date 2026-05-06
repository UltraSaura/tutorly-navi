-- Rename the admin-visible grouped explanation prompt without changing the
-- internal usage_type used by application code.
DO $$
DECLARE
  default_prompt text := $prompt$You are creating an "Explication" for ONE selected row in a grouped homework problem.
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
}$prompt$;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.prompt_templates
    WHERE name = 'Grouped Retry Practice Explanation'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.prompt_templates
    WHERE name = 'Problem Explanation'
  ) THEN
    UPDATE public.prompt_templates
    SET
      name = 'Problem Explanation',
      description = 'Creates TwoCard-style teaching explanations for one selected row in grouped homework problems.',
      subject = 'Math',
      usage_type = 'grouped_retry_practice',
      is_active = true,
      auto_activate = true,
      priority = 100,
      tags = ARRAY['grouped-problem', 'twocard', 'retry-practice'],
      updated_at = NOW()
    WHERE name = 'Grouped Retry Practice Explanation';
  END IF;

  DELETE FROM public.prompt_templates
  WHERE name = 'Grouped Retry Practice Explanation'
    AND EXISTS (
      SELECT 1 FROM public.prompt_templates
      WHERE name = 'Problem Explanation'
    );

  IF NOT EXISTS (
    SELECT 1 FROM public.prompt_templates
    WHERE name = 'Problem Explanation'
  ) THEN
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
      'Problem Explanation',
      'Creates TwoCard-style teaching explanations for one selected row in grouped homework problems.',
      default_prompt,
      'Math',
      'grouped_retry_practice',
      true,
      true,
      100,
      ARRAY['grouped-problem', 'twocard', 'retry-practice']
    );
  ELSE
    UPDATE public.prompt_templates
    SET
      description = 'Creates TwoCard-style teaching explanations for one selected row in grouped homework problems.',
      subject = 'Math',
      usage_type = 'grouped_retry_practice',
      is_active = true,
      auto_activate = true,
      priority = 100,
      tags = ARRAY['grouped-problem', 'twocard', 'retry-practice'],
      updated_at = NOW()
    WHERE name = 'Problem Explanation';
  END IF;
END $$;
