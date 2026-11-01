-- Keep the quick explanation coherent and make its self-check unambiguous.
update public.prompt_templates
set
  prompt_content = replace(
    replace(
      replace(
        prompt_content,
        '- understandingCheck: one quick conceptual or estimation multiple-choice question with exactly 3 choices. It tests the key idea rather than repeating the final calculation. correctChoice must exactly match one choice.',
        '- understandingCheck: ONE self-contained multiple-choice question with exactly 3 distinct choices. Use one fresh set of values and one unambiguous task. It must test the same key idea without repeating the worked example''s final calculation. correctChoice must exactly match one choice.'
      ),
      '- Silently verify every calculation, every equality, the consistency of all frames, and that each highlight is an exact substring of its equation.',
      E'- Use only ONE set of values throughout similarProblem and animationSteps. Never introduce or merge a second example inside those frames.\n- The understanding check must use values different from both the original exercise and the worked example. Do not show its answer before the learner responds.\n- For division with remainder, verify q × divisor + remainder = dividend and 0 ≤ remainder < divisor in both the worked example and the understanding check.\n- For primary pupils, ask one concrete question at a time. Never combine two questions, two examples, or two remainder statements in one sentence.\n- Silently solve the worked example and understanding check before returning JSON. Rebuild the response if any equality, choice, remainder, unit, or explanation is inconsistent.\n- Silently verify every calculation, every equality, the consistency of all frames, and that each highlight is an exact substring of its equation.'
    ),
    '"question": "quick conceptual or estimation question"',
    '"question": "one short, self-contained and unambiguous question"'
  ),
  description = 'Creates one coherent curriculum-aware quick explanation with a validated worked example and unambiguous active check.',
  updated_at = now()
where usage_type = 'grouped_retry_practice'
  and is_active = true;
