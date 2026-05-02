-- Add editable grouped problem extraction/grading prompts and remove the
-- obsolete separate multipart grading prompt category.
ALTER TABLE public.prompt_templates
  DROP CONSTRAINT IF EXISTS prompt_templates_usage_type_check;

DELETE FROM public.prompt_templates
WHERE usage_type = 'grouped_multipart_grading'
   OR name ILIKE '%Grouped Multipart%';

ALTER TABLE public.prompt_templates
  ADD CONSTRAINT prompt_templates_usage_type_check
  CHECK (usage_type IN (
    'chat',
    'grading',
    'explanation',
    'math_enhanced',
    'grouped_problem_extraction',
    'grouped_problem_grading',
    'grouped_retry_practice'
  ));

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
  'Problem Extraction',
  'Extracts uploaded or typed grouped math problems into structured rows before the student answers.',
  $prompt$You are extracting a complete homework problem for a tutoring app.
Return ONLY valid JSON. Do not use markdown fences. Do not include prose outside JSON.
Preserve the original grouped structure. Do not split assertions or numbered sub-questions into separate exercises.
Detect grouped answer choices like Vrai/Faux, QCM, yes/no, and repeated row choices.
Detect multi-part geometry/construction/calculation problems with shared context and numbered questions.
Preserve labels A, B, C, D and shared contexts.
For true/false assertions, keep the student-facing prompts as assertions; do not rewrite them as tasks like "calculate the average".
Return this JSON shape:
{
  "responseType": "grouped_choice_problem|grouped_problem",
  "problemId": "string",
  "title": "string",
  "problemStatement": "string",
  "instructions": "string",
  "answerType": "true_false|text",
  "requiresJustification": true,
  "options": ["Vrai", "Faux"],
  "keepGrouped": true,
  "sections": [
    {
      "id": "section-1",
      "title": "string",
      "context": "shared context",
      "rows": [
        {
          "id": "row-A",
          "label": "A",
          "prompt": "original assertion text or numbered question text",
          "answerType": "true_false|text",
          "rowKind": "choice|calculation|construction|text",
          "options": ["Vrai", "Faux"],
          "requiresJustification": true
        }
      ]
    }
  ]
}$prompt$,
  'Math',
  'grouped_problem_extraction',
  true,
  true,
  100,
  ARRAY['grouped-problem', 'extraction', 'structure']
), (
  'Problem Grading',
  'Grades grouped choice and grouped multipart math problem rows after the student submits answers.',
  $prompt$You are grading a grouped homework problem.
Return ONLY valid JSON. Do not use markdown fences. Do not include prose outside JSON.
Use originalProblemContext as the source of truth for the exercise statement, values, diagrams described by OCR, shared context, row prompts, and correct mathematical interpretation.
Use studentAnswerEvidence only as the student's submitted work.
Never replace or reinterpret original problem values using numbers from the student's answer, justification, or OCR. If studentAnswerEvidence contains different numbers from originalProblemContext, treat that as student work evidence only.
Only grade rows present in studentAnswerEvidence. Do not evaluate, mention, correct, reveal, or explain unsubmitted/unselected rows. Return evaluations only for submitted row IDs.
Keep feedback row-specific and do not split the parent grouped problem into independent exercises.

For grouped_choice_problem rows:
- The student is selecting assertions they believe are correct. A selected row means "I think this assertion is correct".
- Check both the selected assertion and the justification when justification is required.
- The justification may be typed text OR extracted text from uploaded justification attachments.
- Use each selected row's studentAnswerEvidence.extractedAttachmentText as student work evidence.
- Do not say "no justification was provided" when a selected row has readable extracted attachment text.
- if the assertion is mathematically correct and justification is sufficient => status "correct"
- if the assertion is mathematically correct but justification is missing or weak => status "partial"
- if the assertion is mathematically false => status "incorrect"

For grouped_problem rows:
For calculation/text rows, grade the typedAnswer against the row prompt and shared context.
Do not require typed explanations, uploaded proof, or justification for calculation/text rows unless requiresJustification is explicitly true.
For calculation/text rows with no proof required, never return partial/incomplete solely because justification is absent.
Grade the typed answer first; mention missing justification only when requiresJustification is true.
When a calculation/text row has a correct typedAnswer and requiresJustification is false, return status "correct" even if the student did not explain the calculation.
For symbolic geometry rows, compute section variables first (for example x = 1,5), then compute dimensions (for example EF = 2x) before deciding the expected answer.
For construction rows, use typedAnswer plus extractedAttachmentText as proof. If no readable construction proof is present, return status "partial" or "incomplete" and ask for a clearer photo/file.
Keep feedback row-specific and do not split the parent problem into independent exercises.

Return exactly this JSON shape:
{
  "status": "evaluated",
  "overallFeedback": "summary of submitted rows only",
  "missingAnswers": [],
  "recommendedNextAction": "string",
  "sections": [
    {
      "id": "section id from input",
      "rows": [
        {
          "id": "row id from input",
          "label": "row label from input",
          "evaluation": {
            "selectedAnswer": "student answer summary",
            "correctAnswer": "expected result or method summary",
            "isCorrect": true,
            "justificationProvided": true,
            "justificationSufficient": true,
            "status": "correct",
            "feedback": "specific feedback",
            "explanation": "short explanation",
            "score": 1
          }
        }
      ]
    }
  ]
}$prompt$,
  'Math',
  'grouped_problem_grading',
  true,
  true,
  100,
  ARRAY['grouped-problem', 'grading', 'multipart']
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_content = EXCLUDED.prompt_content,
  subject = EXCLUDED.subject,
  usage_type = EXCLUDED.usage_type,
  is_active = true,
  auto_activate = true,
  priority = EXCLUDED.priority,
  tags = EXCLUDED.tags,
  updated_at = NOW();
