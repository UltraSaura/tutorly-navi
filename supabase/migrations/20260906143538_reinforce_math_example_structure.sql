-- Keep worked examples visually comparable to the child's exercise and prefer
-- place-value strategies before a longer written algorithm.
UPDATE public.prompt_templates
SET
  prompt_content = prompt_content || $rules$

## MATH_EXAMPLE_STRUCTURE_V1
- For arithmetic worked examples, keep the exact written shape of the exercise: the same number of digits in the first operand and the same number in the second operand. Do not only match a broad digit band.
- For whole-number multiplication, preserve the trailing-zero/place-value pattern. For example, a 3-digit number ending in two zeros multiplied by a 1-digit number needs an example with that same shape.
- Choose the simplest useful strategy before the standard written algorithm. For multiplication by 10, 100, or numbers ending in zeros: multiply the non-zero digits first, then append the correct number of zeros. Example: 300 × 4: first 3 × 4 = 12; append the two zeros, so 300 × 4 = 1200.
- Use short, explicit sentences. State one calculation, then what to write or do next. In multiplication, a carry created in one column is added only in the next column.
- When helpful, use a small visual representation such as equal groups, an array, a number line, or place-value columns. Explain what the representation shows in plain language.
$rules$,
  updated_at = now()
WHERE usage_type IN ('explanation', 'grouped_retry_practice')
  AND is_active = true
  AND prompt_content NOT LIKE '%MATH_EXAMPLE_STRUCTURE_V1%';
