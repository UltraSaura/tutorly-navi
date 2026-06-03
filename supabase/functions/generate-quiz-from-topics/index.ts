import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  topicIds: string[];
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
        return `- "numeric": Answer is a number. Include "answer" (the correct number) and optionally "range": { "min": X, "max": Y }.`;
      case 'ordering':
        return `- "ordering": Put items in correct order. Include "items" (shuffled array) and "correctOrder" (correct sequence). Frame these as step-building, process-ordering, or action-ordering when appropriate.`;
      case 'visual_pie':
        return `- "visual" with subtype "pie": A fraction/proportion question using a pie chart. The prompt must clearly refer to the pie/chart the student sees. TWO MODES:

  MODE A - "select_pie" (student picks correct pie from variants):
  {
    "id": "q-X", "kind": "visual",
    "prompt": "Which pie shows 1/3 colored?",
    "hint": "Count the colored segments",
    "points": 1,
    "visual": {
      "subtype": "pie",
      "interactionMode": "select_pie",
      "segments": [{"id": "s1", "value": 1, "colored": true}, {"id": "s2", "value": 1, "colored": false}, {"id": "s3", "value": 1, "colored": false}],
      "variants": [
        {"id": "v1", "segments": [{"id": "s1", "value": 1, "colored": true}, {"id": "s2", "value": 1, "colored": false}, {"id": "s3", "value": 1, "colored": false}], "correct": true},
        {"id": "v2", "segments": [{"id": "s1", "value": 1, "colored": true}, {"id": "s2", "value": 1, "colored": true}, {"id": "s3", "value": 1, "colored": false}], "correct": false}
      ]
    }
  }

  MODE B - "color_slices" (student colors slices to represent a fraction):
  {
    "id": "q-X", "kind": "visual",
    "prompt": "Color 2/5 of this pie",
    "hint": "Click slices to color them",
    "points": 1,
    "visual": {
      "subtype": "pie",
      "interactionMode": "color_slices",
      "showFractionLabel": true,
      "correctColoredCount": 2,
      "segments": [{"id": "s1", "value": 1}, {"id": "s2", "value": 1}, {"id": "s3", "value": 1}, {"id": "s4", "value": 1}, {"id": "s5", "value": 1}]
    }
  }

  All segments value=1. Use 2-8 segments. Mix both modes when generating multiple pie questions. For "color_slices", correctColoredCount must match the fraction numerator and segments count = denominator.`;
      case 'visual_angle':
        return `- "visual" with subtype "angle": An angle measurement question. The prompt must clearly refer to the angle/rays the student sees.
  {
    "id": "q-X", "kind": "visual",
    "prompt": "What is the measure of this angle?",
    "points": 1,
    "visual": { "subtype": "angle", "aDeg": 0, "bDeg": 45, "targetDeg": 45, "toleranceDeg": 2 }
  }
  Use angles 10-350. toleranceDeg 2-5.`;
      case 'slider':
        return `- "slider": Student drags a slider to the correct numeric value. Perfect for estimating quantities, reading scales, setting temperatures, choosing a value on a number line, etc.
  Required fields: min (number), max (number), step (number), answer (correct value), tolerance (acceptable ± error, use 0 for exact).
  Optional: unit (string like "°C", "km", "%"), trackLabel (short description shown under the value).
  Example:
  {
    "id": "q-X", "kind": "slider",
    "prompt": "The temperature today is between 20°C and 30°C. Drag the slider to 24°C.",
    "hint": "Find 24 between the two extremes",
    "points": 1,
    "min": 20, "max": 30, "step": 1, "answer": 24, "tolerance": 1, "unit": "°C",
    "trackLabel": "Temperature"
  }`;

      case 'match':
        return `- "match": Student connects left-column items to their right-column matches by tapping pairs. Great for vocabulary ↔ definition, fraction ↔ decimal, term ↔ example, cause ↔ effect.
  CRITICAL: "left" and "right" fields MUST be short plain-text strings only. NO objects, NO images, NO HTML, NO SVG, NO pie charts, NO visual references. If the topic involves fractions, write the fraction as text (e.g. "1/2") and its equivalent as text (e.g. "0.5" or "50%"). If the topic involves shapes, write the shape name as text. Never attempt to embed visual content — the component only renders plain text.
  Required: pairs array (3-5 pairs), each with leftId, left (plain text ≤ 30 chars), rightId, right (plain text ≤ 30 chars). answers maps leftId → rightId.
  Good examples: fraction↔decimal, word↔definition, operation name↔symbol, unit↔equivalent, term↔example.
  Bad examples (DO NOT DO): left="1/2" right={visual object} — this will be blank and discarded.
  OPTIONAL: Add "hide_labels": true to hide the fraction text from students, leaving only the pie chart visible (good for "count the slices" challenge questions). Only use this when the left column contains fractions and the right column contains word descriptions or decimal equivalents.
  Example with hidden labels (challenge mode):
  {
    "id": "q-X", "kind": "match", "hide_labels": true,
    "prompt": "Match each pie chart to its fraction.",
    "hint": "Count the colored slices vs total slices",
    "points": 2,
    "pairs": [
      {"leftId": "l1", "left": "1/4", "rightId": "r1", "right": "One quarter"},
      {"leftId": "l2", "left": "1/2", "rightId": "r2", "right": "One half"},
      {"leftId": "l3", "left": "3/4", "rightId": "r3", "right": "Three quarters"}
    ],
    "answers": {"l1":"r1","l2":"r2","l3":"r3"}
  }
  Example:
  {
    "id": "q-X", "kind": "match",
    "prompt": "Match each fraction to its decimal equivalent.",
    "hint": "Divide the numerator by the denominator",
    "points": 2,
    "pairs": [
      {"leftId": "l1", "left": "1/2",  "rightId": "r1", "right": "0.5"},
      {"leftId": "l2", "left": "1/4",  "rightId": "r2", "right": "0.25"},
      {"leftId": "l3", "left": "3/4",  "rightId": "r3", "right": "0.75"},
      {"leftId": "l4", "left": "1/10", "rightId": "r4", "right": "0.1"}
    ],
    "answers": {"l1":"r1","l2":"r2","l3":"r3","l4":"r4"}
  }`;

      case 'fill_expr':
      case 'fill-expr':
        return `- "fill-expr": Student drags number chips into blanks in a mathematical expression. Perfect for completing equations, filling missing numbers, step-by-step calculation.
  Template uses __ (two underscores) for each blank. blanks is an array of blank IDs (must match count of __ in template). chips is the list of available number options (include distractors). answers maps blankId → correct chip value.
  Example:
  {
    "id": "q-X", "kind": "fill-expr",
    "prompt": "Complete the multiplication: 3 × 4 = __ and 6 × 2 = __",
    "hint": "Multiply each pair",
    "points": 2,
    "template": "3 × 4 = __ et 6 × 2 = __",
    "blanks": ["b1", "b2"],
    "chips": ["10", "12", "14", "8"],
    "answers": {"b1": "12", "b2": "12"}
  }`;

      case 'mix':
        return `Choose the BEST question type for each question from ALL supported kinds: single, multi, numeric, ordering, slider, match, fill-expr, visual pie (select_pie or color_slices mode), visual angle.
Create a rich Brilliant-style variety when the topic allows it:
- single/multi: conceptual recall, verbal reasoning, "which is true" style
- numeric: calculation, apply a rule, find a missing number
- ordering: steps, procedures, sequences, chronological order
- slider: estimate a quantity, read a scale, place a value on a number line
- match: vocabulary ↔ definition, fraction ↔ decimal, term ↔ example
- fill-expr: complete an equation, fill missing numbers in a formula or calculation
- visual pie: fractions, proportions — use color_slices AND select_pie modes alternately
- visual angle: geometry, angle measurement
Prioritise slider, match, and fill-expr when the topic involves numbers, equivalences, or formulas — these create the most engaging interactive experience.`;
      default:
        return '';
    }
  }).filter(Boolean).join('\n');
}

function buildLearningFriendlyGuidance(): string {
  return `LEARNING-FRIENDLY PRACTICE GUIDANCE:
- Keep every question focused on the same academic objectives from the topic context.
- Use a healthy variety of representations across the quiz when the requested types allow it: see it, say/reason it, do/order it, calculate/apply it.
- Hints must be child-friendly and useful: give one small next step, cue, or thing to look for. Do not reveal the answer.
- For visual questions, the prompt and hint must clearly refer to the visual element the student sees, such as the pie, slices, angle, or rays.
- For ordering questions, use step-building, process-ordering, or action-ordering language when appropriate.
- For single and multi questions, include some verbal-reasoning answer choices when appropriate, such as short explanations, comparison statements, or "which sentence is true" choices.
- Do not use technical labels such as visual learner, auditory learner, kinesthetic learner, learning modality, or cognitive preference.
- Do not invent unsupported question kinds. Use only: single, multi, numeric, ordering, visual, slider, match, fill-expr.
- For slider: always include min, max, step, answer, tolerance. For match: always include 3-5 pairs and an answers object. For fill-expr: always include template, blanks, chips, answers.`;
}

function validateQuestions(questions: any[]): any[] {
  const validKinds = new Set(['single', 'multi', 'numeric', 'ordering', 'visual', 'slider', 'match', 'fill-expr']);
  const validVisualSubtypes = new Set(['pie', 'angle']);

  return questions.filter((q, idx) => {
    if (!q.id) q.id = `q-${idx + 1}`;
    if (!q.prompt) return false;
    if (!validKinds.has(q.kind)) return false;

    if (q.kind === 'single') {
      if (!Array.isArray(q.choices) || q.choices.length < 2) return false;
      if (q.choices.filter((c: any) => c.correct).length !== 1) return false;
      q.choices.forEach((c: any, i: number) => { if (!c.id) c.id = `c${i + 1}`; });
    }
    if (q.kind === 'multi') {
      if (!Array.isArray(q.choices) || q.choices.length < 2) return false;
      if (q.choices.filter((c: any) => c.correct).length < 2) return false;
      q.choices.forEach((c: any, i: number) => { if (!c.id) c.id = `c${i + 1}`; });
    }
    if (q.kind === 'numeric' && typeof q.answer !== 'number') return false;
    if (q.kind === 'ordering') {
      if (!Array.isArray(q.items) || !Array.isArray(q.correctOrder) || q.items.length < 2) return false;
    }
    if (q.kind === 'visual') {
      if (!q.visual || !validVisualSubtypes.has(q.visual.subtype)) return false;
      if (q.visual.subtype === 'pie') {
        if (!Array.isArray(q.visual.segments) || q.visual.segments.length < 2) return false;
        q.visual.segments.forEach((s: any, i: number) => { if (!s.id) s.id = `s${i + 1}`; });
        if (!q.visual.interactionMode) q.visual.interactionMode = 'select_pie';
        if (q.visual.interactionMode === 'select_pie') {
          if (q.visual.variants) q.visual.variants.forEach((v: any, i: number) => { if (!v.id) v.id = `v${i + 1}`; });
        } else if (q.visual.interactionMode === 'color_slices') {
          if (typeof q.visual.correctColoredCount !== 'number') return false;
          if (q.visual.correctColoredCount < 0 || q.visual.correctColoredCount > q.visual.segments.length) return false;
        }
      }
      if (q.visual.subtype === 'angle') {
        if (typeof q.visual.targetDeg !== 'number') return false;
        if (typeof q.visual.toleranceDeg !== 'number') q.visual.toleranceDeg = 3;
        if (typeof q.visual.aDeg !== 'number') q.visual.aDeg = 0;
        if (typeof q.visual.bDeg !== 'number') q.visual.bDeg = q.visual.targetDeg;
      }
    }
    // Slider validation
    if (q.kind === 'slider') {
      if (typeof q.min !== 'number' || typeof q.max !== 'number') return false;
      if (typeof q.answer !== 'number') return false;
      if (typeof q.step !== 'number') q.step = 1;
      if (typeof q.tolerance !== 'number') q.tolerance = Math.max(1, Math.round((q.max - q.min) / 20));
      if (q.answer < q.min || q.answer > q.max) return false;
    }
    // Match validation
    if (q.kind === 'match') {
      if (!Array.isArray(q.pairs) || q.pairs.length < 2) return false;
      // Ensure left/right are plain non-empty strings — reject any pair with object values
      const validPairs = q.pairs.filter((p: any) =>
        typeof p.left === 'string' && p.left.trim() !== '' &&
        typeof p.right === 'string' && p.right.trim() !== ''
      );
      if (validPairs.length < 2) return false; // discard the whole question if <2 valid pairs
      q.pairs = validPairs;
      q.pairs.forEach((p: any, i: number) => {
        if (!p.leftId)  p.leftId  = `l${i + 1}`;
        if (!p.rightId) p.rightId = `r${i + 1}`;
      });
      if (!q.answers || typeof q.answers !== 'object') {
        q.answers = Object.fromEntries(q.pairs.map((p: any) => [p.leftId, p.rightId]));
      }
      // Preserve hide_labels if set
      if (q.hide_labels !== true) delete q.hide_labels;
    }
    // Fill-expr validation
    if (q.kind === 'fill-expr') {
      if (typeof q.template !== 'string') return false;
      if (!Array.isArray(q.blanks) || q.blanks.length === 0) return false;
      if (!Array.isArray(q.chips) || q.chips.length === 0) return false;
      if (!q.answers || typeof q.answers !== 'object') return false;
      // Count __ in template must match blanks length
      const blankCount = (q.template.match(/_{2,}/g) || []).length;
      if (blankCount !== q.blanks.length) return false;
    }
    if (!q.points) q.points = 1;
    return true;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { topicIds, questionCount = 5, questionTypes = ['single', 'multi', 'numeric', 'ordering'], difficulty = 'medium', mix = false }: GenerateRequest = await req.json();

    if (!topicIds || topicIds.length === 0) {
      return new Response(JSON.stringify({ error: "No topic IDs provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch topics with their metadata
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name, description, keywords, curriculum_domain_id, curriculum_subdomain_id, curriculum_level_code')
      .in('id', topicIds);

    if (topicsError) throw new Error("Failed to fetch topics");
    if (!topics || topics.length === 0) {
      return new Response(JSON.stringify({ error: "No topics found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch linked objectives
    const { data: topicObjectives } = await supabase
      .from('topic_objective_links')
      .select('topic_id, objective_id')
      .in('topic_id', topicIds);

    let objectives: any[] = [];
    if (topicObjectives && topicObjectives.length > 0) {
      const objIds = [...new Set(topicObjectives.map(to => to.objective_id))];
      const { data: objData } = await supabase
        .from('objectives')
        .select('id, text, subdomain, domain, level')
        .in('id', objIds);
      objectives = objData || [];
    }

    // Build context from topic metadata
    const topicContext = topics.map(t => {
      const topicObjs = topicObjectives?.filter(to => to.topic_id === t.id) || [];
      const relatedObjectives = objectives.filter(o => topicObjs.some(to => to.objective_id === o.id));
      
      let ctx = `[Topic: ${t.name}]`;
      if (t.description) ctx += `\nDescription: ${t.description}`;
      if (t.keywords && t.keywords.length > 0) ctx += `\nKeywords: ${t.keywords.join(', ')}`;
      if (t.curriculum_level_code) ctx += `\nLevel: ${t.curriculum_level_code}`;
      if (relatedObjectives.length > 0) {
        ctx += `\nLearning Objectives:\n${relatedObjectives.map(o => `- ${o.text} (${o.subdomain})`).join('\n')}`;
      }
      return ctx;
    }).join('\n\n---\n\n');

    const topicNames = topics.map(t => t.name);

    const effectiveTypes = mix ? ['mix'] : questionTypes;
    const typeInstructions = buildTypeInstructions(effectiveTypes);

    const difficultyGuide: Record<string, string> = {
      easy: 'Simple recall questions, straightforward concepts.',
      medium: 'Requires understanding and application.',
      hard: 'Complex reasoning, subtle distinctions.'
    };

    const prompt = `You are an expert educator creating quiz questions based on curriculum topics and learning objectives.

TOPIC AND CURRICULUM CONTEXT:
---
${topicContext}
---

Generate exactly ${questionCount} quiz questions based on these topics and learning objectives. Questions should test the student's understanding of the concepts described above.

QUESTION TYPES TO USE:
${typeInstructions}

${buildLearningFriendlyGuidance()}

DIFFICULTY: ${difficulty}
${difficultyGuide[difficulty]}

Return ONLY a valid JSON array. Each question must follow one of these structures:

For "single" or "multi":
{ "id": "q-1", "kind": "single", "prompt": "...", "hint": "...", "points": 1, "choices": [{"id": "c1", "label": "...", "correct": true/false}, ...] }

For "numeric":
{ "id": "q-2", "kind": "numeric", "prompt": "...", "hint": "...", "points": 1, "answer": 42, "range": {"min": 40, "max": 44} }

For "ordering":
{ "id": "q-3", "kind": "ordering", "prompt": "...", "hint": "...", "points": 1, "items": ["B","A","C"], "correctOrder": ["A","B","C"] }

RULES:
- Questions must test the curriculum topics and objectives provided
- Each question ID unique (q-1, q-2, etc.)
- 4 choices for single/multi; multi has 2-3 correct
- Hints must be short, encouraging, and actionable without giving away the answer
- Visual prompts must mention the visual object the student should inspect
- Use only supported output kinds: single, multi, numeric, ordering, visual
- Return ONLY the JSON array`;

    console.log("Calling AI gateway for topic-based generation, prompt length:", prompt.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a quiz generation assistant. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI generation failed");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let rawQuestions;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      rawQuestions = JSON.parse(jsonStr.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse generated questions");
    }

    if (!Array.isArray(rawQuestions)) throw new Error("AI response is not an array");

    const questions = validateQuestions(rawQuestions);
    if (questions.length === 0) throw new Error("No valid questions after validation");

    console.log(`Generated ${questions.length} valid questions from ${topics.length} topics`);

    return new Response(
      JSON.stringify({ questions, topicNames }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-quiz-from-topics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
