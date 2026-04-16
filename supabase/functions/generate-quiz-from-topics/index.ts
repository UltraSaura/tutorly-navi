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
        return `- "ordering": Put items in correct order. Include "items" (shuffled array) and "correctOrder" (correct sequence).`;
      case 'visual_pie':
        return `- "visual" with subtype "pie": A fraction/proportion question using a pie chart.
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
  All segments value=1. Use 2-8 segments. Exactly one variant correct.`;
      case 'visual_angle':
        return `- "visual" with subtype "angle": An angle measurement question.
  {
    "id": "q-X", "kind": "visual",
    "prompt": "What is the measure of this angle?",
    "points": 1,
    "visual": { "subtype": "angle", "aDeg": 0, "bDeg": 45, "targetDeg": 45, "toleranceDeg": 2 }
  }
  Use angles 10-350. toleranceDeg 2-5.`;
      case 'mix':
        return `Choose the BEST question type for each question from: single, multi, numeric, ordering, visual (pie), visual (angle). Mix types. For fractions use pie. For geometry use angle. For sequences use ordering. For recall use single/multi.`;
      default:
        return '';
    }
  }).filter(Boolean).join('\n');
}

function validateQuestions(questions: any[]): any[] {
  const validKinds = new Set(['single', 'multi', 'numeric', 'ordering', 'visual']);
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
        if (q.visual.variants) q.visual.variants.forEach((v: any, i: number) => { if (!v.id) v.id = `v${i + 1}`; });
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
      .from('learning_topics')
      .select('id, name, description, keywords, curriculum_domain_id, curriculum_subdomain_id, curriculum_level_code')
      .in('id', topicIds);

    if (topicsError) throw new Error("Failed to fetch topics");
    if (!topics || topics.length === 0) {
      return new Response(JSON.stringify({ error: "No topics found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch linked objectives
    const { data: topicObjectives } = await supabase
      .from('topic_objectives')
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
