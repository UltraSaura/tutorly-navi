import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  videoIds: string[];
  questionCount?: number;
  questionTypes?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { videoIds, questionCount = 5, questionTypes = ['single', 'multi', 'numeric', 'ordering'], difficulty = 'medium' }: GenerateRequest = await req.json();

    if (!videoIds || videoIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No video IDs provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch videos with transcripts
    const { data: videos, error: videosError } = await supabase
      .from('learning_videos')
      .select('id, title, transcript')
      .in('id', videoIds)
      .not('transcript', 'is', null);

    if (videosError) {
      console.error("Error fetching videos:", videosError);
      throw new Error("Failed to fetch videos");
    }

    if (!videos || videos.length === 0) {
      return new Response(
        JSON.stringify({ error: "No videos with transcripts found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate transcripts
    const aggregatedTranscript = videos
      .map(v => `[Video: ${v.title}]\n${v.transcript}`)
      .join('\n\n---\n\n');
    
    const wordCount = aggregatedTranscript.trim().split(/\s+/).filter(Boolean).length;
    const videoTitles = videos.map(v => v.title);

    // Build AI prompt
    const typeInstructions = questionTypes.map(type => {
      switch (type) {
        case 'single':
          return `- "single": Multiple choice with exactly ONE correct answer. Include 4 choices with "correct": true on only one.`;
        case 'multi':
          return `- "multi": Multiple choice with MULTIPLE correct answers (2-3 typically). Include 4 choices with "correct": true on multiple.`;
        case 'numeric':
          return `- "numeric": Answer is a number. Include "answer" (the correct number) and optionally "range": { "min": X, "max": Y } for acceptable range.`;
        case 'ordering':
          return `- "ordering": Put items in correct order. Include "items" (shuffled array of strings) and "correctOrder" (same items in correct sequence).`;
        default:
          return '';
      }
    }).filter(Boolean).join('\n');

    const difficultyGuide = {
      easy: 'Simple recall questions, straightforward concepts, obvious answers.',
      medium: 'Requires understanding and application, some inference needed.',
      hard: 'Complex reasoning, subtle distinctions, requires deep comprehension.'
    };

    const prompt = `You are an expert educator creating quiz questions based on video transcript content.

TRANSCRIPT CONTENT:
---
${aggregatedTranscript}
---

Generate exactly ${questionCount} quiz questions based on this content.

QUESTION TYPES TO USE:
${typeInstructions}

DIFFICULTY: ${difficulty}
${difficultyGuide[difficulty]}

Return ONLY a valid JSON array with questions following this exact structure:

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

RULES:
- Questions must be directly based on transcript content
- Each question ID should be unique (q-1, q-2, etc.)
- Each choice ID should be unique within a question (c1, c2, etc.)
- Include 4 choices for single/multi choice questions
- For multi questions, mark 2-3 choices as correct
- Make questions clear, educational, and age-appropriate
- Vary question types across the set based on the types requested
- Return ONLY the JSON array, no markdown, no explanation`;

    console.log("Calling AI gateway with prompt length:", prompt.length);

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
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI generation failed");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response - handle potential markdown code blocks
    let questions;
    try {
      let jsonStr = content.trim();
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();
      
      questions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse generated questions");
    }

    if (!Array.isArray(questions)) {
      throw new Error("AI response is not an array of questions");
    }

    console.log(`Generated ${questions.length} questions from ${videos.length} videos`);

    return new Response(
      JSON.stringify({
        questions,
        aggregatedWordCount: wordCount,
        aggregatedTranscript,
        videoTitles,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-quiz-from-transcripts error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
