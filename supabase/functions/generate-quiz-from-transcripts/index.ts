import { requirePrivilegedFamily } from '../_shared/family-access.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildColumnFillQuestion } from "../../../src/lib/quiz/columnFillBuilder.ts";
import { safeProviderContentDiagnostics } from '../_shared/provider-diagnostics.ts';
import { fetchProviderResponse, isRetryableProviderFailure, PROVIDER_TOTAL_BUDGET_MS, readProviderJson } from '../_shared/provider-request.ts';
import { generateQuizIncrementally, IncrementalQuizGenerationError, QUIZ_BATCH_SIZE, QUIZ_MAX_PROVIDER_CALLS, QUIZ_MAX_RETRIES_PER_BATCH } from '../_shared/incremental-quiz-generation.ts';
import { resolveProviderKey } from '../_shared/resolveProviderKey.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-family-grant",
};

interface GenerateRequest {
  videoIds: string[];
  questionCount?: number;
  questionTypes?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  mix?: boolean;
}

function buildTypeInstructions(questionTypes: string[]): string {
  return questionTypes.map(type => {
    switch (type) {
      case 'single':
        return `- "single": Multiple choice with exactly ONE correct answer. Include 4 choices with "correct": true on only one.`;
      case 'multi':
        return `- "multi": Multiple choice with MULTIPLE correct answers (2-3 typically). Include 4 choices with "correct": true on multiple.`;
      case 'numeric':
        return `- "numeric": Answer is a number. Include "answer" (the correct number) and optionally "range": { "min": X, "max": Y } for acceptable range.`;
      case 'ordering':
        return `- "ordering": Put items in correct order. Include "items" (shuffled array of strings) and "correctOrder" (same items in correct sequence). Frame these as step-building, process-ordering, or action-ordering when appropriate.`;
      case 'column-fill':
        return `- "column-fill": Student fills missing digits inside a column-method arithmetic layout. Use this only for kid-friendly arithmetic taken directly from the transcript content.
  Required fields:
  {
    "id": "q-X",
    "kind": "column-fill",
    "prompt": "...",
    "hint": "...",
    "points": 1,
    "operation": "addition" | "subtraction" | "multiplication" | "division",
    "operands": ["29", "66"],
    "instructions": "Complète les retenues et le résultat."
  }
  IMPORTANT:
  - Do NOT generate the layout object yourself. The app builds the layout from operation + operands.
  - Multiplication must use a one-digit second operand only.
  - Division must use whole numbers only with a non-zero divisor.`;
      case 'visual_pie':
        return `- "visual" with subtype "pie": A fraction/proportion question using a pie chart. The prompt must clearly refer to the pie/chart the student sees. The student selects which pie chart shows the correct fraction.
  Structure:
  {
    "id": "q-X", "kind": "visual",
    "prompt": "Which pie shows 1/3 colored?",
    "hint": "Count the colored segments",
    "points": 1,
    "visual": {
      "subtype": "pie",
      "interactionMode": "select_pie",
      "segments": [
        {"id": "s1", "value": 1, "colored": true},
        {"id": "s2", "value": 1, "colored": false},
        {"id": "s3", "value": 1, "colored": false}
      ],
      "variants": [
        {"id": "v1", "segments": [{"id": "s1", "value": 1, "colored": true}, {"id": "s2", "value": 1, "colored": false}, {"id": "s3", "value": 1, "colored": false}], "correct": true},
        {"id": "v2", "segments": [{"id": "s1", "value": 1, "colored": true}, {"id": "s2", "value": 1, "colored": true}, {"id": "s3", "value": 1, "colored": false}], "correct": false},
        {"id": "v3", "segments": [{"id": "s1", "value": 1, "colored": true}, {"id": "s2", "value": 1, "colored": true}, {"id": "s3", "value": 1, "colored": true}], "correct": false}
      ]
    }
  }
  Rules for pie: all segments must have equal value (1). Use 2-8 segments total. "colored": true means that segment is shaded. Each variant must have a unique id and different coloring pattern. Exactly one variant must be correct.`;
      case 'visual_angle':
        return `- "visual" with subtype "angle": An angle measurement question. The prompt must clearly refer to the angle/rays the student sees. The student estimates or inputs the angle.
  Structure:
  {
    "id": "q-X", "kind": "visual",
    "prompt": "What is the measure of this angle?",
    "hint": "Look at the space between the two rays",
    "points": 1,
    "visual": {
      "subtype": "angle",
      "aDeg": 0,
      "bDeg": 45,
      "targetDeg": 45,
      "toleranceDeg": 2
    }
  }
  Rules for angle: aDeg is the first ray angle (usually 0), bDeg is the second ray. targetDeg is the correct answer. toleranceDeg is the accepted error margin (use 2-5). Use angles between 10 and 350.`;
      case 'mix':
        return `Choose the BEST question type for each question from the supported kinds only: single, multi, numeric, ordering, column-fill, visual (pie), visual (angle).
Create a balanced variety when the transcript content allows it:
- Include at least one standard conceptual question using single or multi when possible.
- Include at least one visual question when the transcript naturally supports pie charts, fractions, proportions, geometry, or angle measurement.
- Include at least one ordering/action-style question when the transcript includes steps, processes, procedures, comparisons, or sequences.
- Include at least one numeric or application question when calculation or applying a rule is appropriate.
 - Use column-fill for primary-school arithmetic procedures when the transcript clearly teaches the column method.
For fraction/proportion topics prefer visual pie. For geometry topics prefer visual angle. For sequences prefer ordering. For recall and verbal reasoning use single/multi.`;
      default:
        return '';
    }
  }).filter(Boolean).join('\n');
}

function buildLearningFriendlyGuidance(): string {
  return `LEARNING-FRIENDLY PRACTICE GUIDANCE:
- Keep every question directly based on the transcript content and focused on the same academic objective.
- Use a healthy variety of representations across the quiz when the requested types allow it: see it, say/reason it, do/order it, calculate/apply it.
- Hints must be child-friendly and useful: give one small next step, cue, or thing to look for. Do not reveal the answer.
- For visual questions, the prompt and hint must clearly refer to the visual element the student sees, such as the pie, slices, angle, or rays.
- For ordering questions, use step-building, process-ordering, or action-ordering language when appropriate.
- For single and multi questions, include some verbal-reasoning answer choices when appropriate, such as short explanations, comparison statements, or "which sentence is true" choices.
- Do not use technical labels such as visual learner, auditory learner, kinesthetic learner, learning modality, or cognitive preference.
- Do not invent unsupported question kinds. Use only: single, multi, numeric, ordering, column-fill, visual.`;
}

function buildBatchSchemaGuidance(questionTypes: string[]): string {
  const types = questionTypes.includes('mix')
    ? ['single', 'multi', 'numeric', 'ordering', 'column-fill', 'visual']
    : questionTypes;
  return types.map((type) => {
    switch (type) {
      case 'single': return 'single: id, kind, prompt, hint, points, choices[{id,label,correct}] with exactly one correct choice.';
      case 'multi': return 'multi: id, kind, prompt, hint, points, choices[{id,label,correct}] with at least two correct choices.';
      case 'numeric': return 'numeric: id, kind, prompt, hint, points, numeric answer; include answerUnit for measured quantities.';
      case 'ordering': return 'ordering: id, kind, prompt, hint, points, items[], correctOrder[] containing the same items.';
      case 'column-fill': return 'column-fill: id, kind, prompt, hint, points, operation, operands[2], instructions.';
      case 'visual': return 'visual: id, kind, prompt, hint, points, visual with a supported subtype and complete data.';
      default: return '';
    }
  }).filter(Boolean).join('\n');
}

function maxOutputTokensForBatch(count: number): number {
  return Math.min(2048, 512 + Math.max(1, count) * 512);
}

function buildPromptExamples(): string {
  return `
For "single" or "multi" questions:
{
  "id": "q-1",
  "kind": "single",
  "prompt": "Question text here?",
  "hint": "Optional hint for students",
  "points": 1,
  "choices": [
    {"id": "c1", "label": "Option A", "correct": true},
    {"id": "c2", "label": "Option B", "correct": false},
    {"id": "c3", "label": "Option C", "correct": false},
    {"id": "c4", "label": "Option D", "correct": false}
  ]
}

For "numeric" questions:
{
  "id": "q-2",
  "kind": "numeric",
  "prompt": "What is the result of...?",
  "hint": "Optional hint",
  "points": 1,
  "answer": 42,
  "range": { "min": 40, "max": 44 }
}

For "ordering" questions:
{
  "id": "q-3",
  "kind": "ordering",
  "prompt": "Arrange these steps in the correct order:",
  "hint": "Optional hint",
  "points": 1,
  "items": ["Step B", "Step A", "Step C", "Step D"],
  "correctOrder": ["Step A", "Step B", "Step C", "Step D"]
}

For "column-fill" questions:
{
  "id": "q-4",
  "kind": "column-fill",
  "prompt": "Complète l'addition posée.",
  "hint": "Commence par les unités.",
  "points": 1,
  "operation": "addition",
  "operands": ["29", "66"],
  "instructions": "Complète les retenues et le résultat."
}`;
}

function validateQuestions(questions: any[]): any[] {
  const validKinds = new Set(['single', 'multi', 'numeric', 'ordering', 'column-fill', 'visual']);
  const validVisualSubtypes = new Set(['pie', 'angle']);

  return questions.filter((q, idx) => {
    // Ensure id and prompt
    if (!q.id) q.id = `q-${idx + 1}`;
    if (!q.prompt) return false;
    if (!validKinds.has(q.kind)) return false;

    if (q.kind === 'single') {
      if (!Array.isArray(q.choices) || q.choices.length < 2) return false;
      const correctCount = q.choices.filter((c: any) => c.correct).length;
      if (correctCount !== 1) return false;
      q.choices.forEach((c: any, i: number) => { if (!c.id) c.id = `c${i + 1}`; });
    }

    if (q.kind === 'multi') {
      if (!Array.isArray(q.choices) || q.choices.length < 2) return false;
      const correctCount = q.choices.filter((c: any) => c.correct).length;
      if (correctCount < 2) return false;
      q.choices.forEach((c: any, i: number) => { if (!c.id) c.id = `c${i + 1}`; });
    }

    if (q.kind === 'numeric') {
      if (typeof q.answer !== 'number') q.answer = Number(q.answer);
      if (!Number.isFinite(q.answer)) return false;
    }

    if (q.kind === 'ordering') {
      if (!Array.isArray(q.items) || !Array.isArray(q.correctOrder)) return false;
      if (q.items.length < 2) return false;
    }

    if (q.kind === 'column-fill') {
      if (!['addition', 'subtraction', 'multiplication', 'division'].includes(q.operation)) return false;
      if (!Array.isArray(q.operands) || q.operands.length !== 2) return false;
      const first = Number(q.operands[0]);
      const second = Number(q.operands[1]);
      if (!Number.isFinite(first) || !Number.isFinite(second)) return false;
      if (q.operation === 'multiplication' && String(Math.abs(Math.trunc(second))).length > 1) return false;
      if (q.operation === 'division' && Math.trunc(second) === 0) return false;
      const built = buildColumnFillQuestion({
        id: q.id,
        prompt: q.prompt,
        hint: q.hint,
        points: q.points,
        operation: q.operation,
        firstOperand: Math.trunc(first),
        secondOperand: Math.trunc(second),
        locale: 'fr',
        instructions: typeof q.instructions === 'string' ? q.instructions : undefined,
      });
      Object.assign(q, built);
    }

    if (q.kind === 'visual') {
      if (!q.visual || !validVisualSubtypes.has(q.visual.subtype)) return false;
      if (q.visual.subtype === 'pie') {
        if (!Array.isArray(q.visual.segments) || q.visual.segments.length < 2) return false;
        q.visual.segments.forEach((s: any, i: number) => { if (!s.id) s.id = `s${i + 1}`; });
        if (q.visual.variants) {
          q.visual.variants.forEach((v: any, i: number) => { if (!v.id) v.id = `v${i + 1}`; });
        }
        if (!q.visual.interactionMode) q.visual.interactionMode = 'select_pie';
      }
      if (q.visual.subtype === 'angle') {
        if (typeof q.visual.targetDeg !== 'number') return false;
        if (typeof q.visual.toleranceDeg !== 'number') q.visual.toleranceDeg = 3;
        if (typeof q.visual.aDeg !== 'number') q.visual.aDeg = 0;
        if (typeof q.visual.bDeg !== 'number') q.visual.bDeg = q.visual.targetDeg;
      }
    }

    if (!q.points) q.points = 1;
    return true;
  });
}

function parseJsonResponse(content: string): any[] {
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
  else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();
  const parsed = JSON.parse(jsonStr);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
  throw new Error('AI response does not contain a questions array');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await requirePrivilegedFamily(req);
    const { value: deepseekApiKey } = await resolveProviderKey('DeepSeek');

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { videoIds, questionCount = 5, questionTypes = ['single', 'multi', 'numeric', 'ordering'], difficulty = 'medium', mix = false }: GenerateRequest = await req.json();

    if (!videoIds || videoIds.length === 0) {
      return new Response(JSON.stringify({ error: "No video IDs provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, title, transcript')
      .in('id', videoIds)
      .not('transcript', 'is', null);

    if (videosError) throw new Error("Failed to fetch videos");
    if (!videos || videos.length === 0) {
      return new Response(JSON.stringify({ error: "No videos with transcripts found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aggregatedTranscript = videos.map(v => `[Video: ${v.title}]\n${v.transcript}`).join('\n\n---\n\n');
    const wordCount = aggregatedTranscript.trim().split(/\s+/).filter(Boolean).length;
    const videoTitles = videos.map(v => v.title);

    const effectiveTypes = mix ? ['mix'] : questionTypes;
    const typeInstructions = buildTypeInstructions(effectiveTypes);

    const difficultyGuide: Record<string, string> = {
      easy: 'Simple recall questions, straightforward concepts, obvious answers.',
      medium: 'Requires understanding and application, some inference needed.',
      hard: 'Complex reasoning, subtle distinctions, requires deep comprehension.'
    };

    const buildPrompt = (count: number, existingPrompts: string[] = []) => `You are an expert educator creating quiz questions based on video transcript content.

TRANSCRIPT CONTENT:
---
${aggregatedTranscript}
---

Generate exactly ${count} quiz questions based on this content.
${existingPrompts.length ? `\nDo NOT repeat these existing prompts:\n${existingPrompts.map((prompt) => `- ${prompt}`).join('\n')}\n` : ''}

QUESTION TYPES TO USE:
${typeInstructions}

${buildLearningFriendlyGuidance()}

DIFFICULTY: ${difficulty}
${difficultyGuide[difficulty]}

Return ONLY one valid JSON object with a "questions" array following these required structures:
${buildBatchSchemaGuidance(effectiveTypes)}

RULES:
- Questions must be directly based on transcript content
- Each question ID should be unique (q-1, q-2, etc.)
- Each choice ID should be unique within a question (c1, c2, etc.)
- Include 4 choices for single/multi choice questions
- For multi questions, mark 2-3 choices as correct
- Make questions clear, educational, and age-appropriate
- Vary question types across the set based on the types requested
- Hints must be short, encouraging, and actionable without giving away the answer
- Visual prompts must mention the visual object the student should inspect
- Use only supported output kinds: single, multi, numeric, ordering, column-fill, visual
- Return ONLY the JSON object {"questions":[...]}, no markdown, no explanation`;

    const callAiForQuestions = async (count: number, existingPrompts: string[], deadline: number) => {
      const prompt = buildPrompt(count, existingPrompts);
      console.log("Calling DeepSeek, prompt length:", prompt.length, "requested:", count);

      const response = await fetchProviderResponse("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${deepseekApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "You are a quiz generation assistant. Always respond with valid JSON only." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: maxOutputTokensForBatch(count),
        }),
      }, { deadline, signal: req.signal });

      const aiResponse = await readProviderJson<Record<string, any>>(response, { deadline });
      const content = aiResponse.choices?.[0]?.message?.content;
      if (!content) throw new Error("No content in AI response");

      try {
        const parsed = parseJsonResponse(content);
        if (!Array.isArray(parsed)) throw new Error("AI response is not an array of questions");
        return parsed;
      } catch {
        console.error("Failed to parse AI response", safeProviderContentDiagnostics(content, content.trim() ? 'malformed' : 'empty'));
        throw new Error("Failed to parse generated questions");
      }
    };

    const desiredCount = Math.max(1, Math.min(20, Number(questionCount) || 5));

    const generationDeadline = Date.now() + PROVIDER_TOTAL_BUDGET_MS;
    const generation = await generateQuizIncrementally({
      requested: desiredCount,
      deadline: generationDeadline,
      batchSize: QUIZ_BATCH_SIZE,
      maxProviderCalls: QUIZ_MAX_PROVIDER_CALLS,
      maxRetriesPerBatch: QUIZ_MAX_RETRIES_PER_BATCH,
      callBatch: callAiForQuestions,
      validateBatch: validateQuestions,
      promptOf: (question) => String(question.prompt || ''),
      isRetryable: isRetryableProviderFailure,
      signal: req.signal,
    });
    const questions = generation.questions;

    questions.forEach((question, index) => {
      question.id = `q-${index + 1}`;
    });

    console.log(`Generated ${questions.length} valid questions from ${videos.length} videos`);

    return new Response(
      JSON.stringify({ questions: questions.slice(0, desiredCount), aggregatedWordCount: wordCount, aggregatedTranscript, videoTitles }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    if (error instanceof IncrementalQuizGenerationError) {
      console.error("generate-quiz-from-transcripts incremental failure:", {
        requested: error.progress.requested,
        generated: error.progress.generated,
        remaining: error.progress.remaining,
        providerCalls: error.progress.providerCalls,
        retryCount: error.progress.retryCount,
        failedBatch: error.progress.failedBatch,
        failureCategory: error.progress.failureCategory,
      });
      return new Response(JSON.stringify({
        error: error.message,
        progress: {
          requested: error.progress.requested,
          generated: error.progress.generated,
          remaining: error.progress.remaining,
          providerCalls: error.progress.providerCalls,
          retryCount: error.progress.retryCount,
          failedBatch: error.progress.failedBatch,
          failureCategory: error.progress.failureCategory,
          questions: error.progress.questions,
        },
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.error("generate-quiz-from-transcripts error:", error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
