import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_MODELS = ['gpt-5', 'gpt-4.1', 'deepseek-chat', 'claude-3-5-sonnet-20241022'];

function normalizeModelId(modelId: string): string {
  const modelMap: Record<string, string> = {
    'gpt-5-2025-08-07': 'gpt-5',
    'gpt-5-mini-2025-08-07': 'gpt-5',
    'gpt-5-nano-2025-08-07': 'gpt-5',
    'gpt-4.1-2025-04-14': 'gpt-4.1',
    'gpt-4.1-mini-2025-04-14': 'gpt-4.1',
    'gpt-4o': 'gpt-4.1',
    'gpt-4o-mini': 'gpt-4.1',
    'deepseek-chat': 'deepseek-chat',
    'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
    'google/gemini-2.5-flash': 'gpt-5',
    'google/gemini-2.5-pro': 'gpt-5',
  };
  return modelMap[modelId] || modelId;
}

function resolveModel(modelId: string | undefined): string {
  if (!modelId) return 'gpt-5';
  const normalized = normalizeModelId(modelId);
  if (SUPPORTED_MODELS.includes(normalized)) return normalized;
  console.warn(`[resolveModel] Model "${modelId}" not supported, falling back to gpt-5`);
  return 'gpt-5';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'teacher']);

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin or teacher role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { topicId, modelId: requestModelId, language = 'fr' } = await req.json();

    if (!topicId) {
      return new Response(
        JSON.stringify({ error: 'Missing topicId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let adminSelectedModel = 'deepseek-chat';
    try {
      const { data: modelConfig, error: modelError } = await supabase
        .rpc('get_model_with_fallback')
        .single();
      const config = modelConfig as { default_model_id?: string } | null;
      if (!modelError && config?.default_model_id) {
        adminSelectedModel = config.default_model_id;
      }
    } catch (err) {
      console.warn('[generate-lesson-content] Error fetching model config:', err);
    }

    const modelId = resolveModel(requestModelId || adminSelectedModel);
    console.log('[generate-lesson-content] Starting for topic:', topicId, '| model:', modelId, '| language:', language);

    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select(`
        id, name, description,
        curriculum_country_code, curriculum_level_code,
        curriculum_subject_id, curriculum_domain_id, curriculum_subdomain_id,
        learning_categories ( subjects ( name ) )
      `)
      .eq('id', topicId)
      .single();

    if (topicError || !topic) {
      throw new Error(`Topic not found: ${topicError?.message}`);
    }

    const objectives: Array<{ text: string }> = [];
    const successCriteriaTexts: string[] = [];
    const successCriteriaIds: string[] = [];

    const tasks: any[] = [];

    const practiceTasks = tasks.filter(t => t.type === 'practice');
    const exitTasks = tasks.filter(t => t.type === 'exit');

    const categories = topic.learning_categories as { subjects?: { name: string } } | null;
    const subjectName = categories?.subjects?.name || 'General';
    const langLabel = language === 'fr' ? 'French' : 'English';

    const prompt = `You are an expert educator creating lesson content for ${langLabel}-speaking students. Write the entire response in ${langLabel}.

Topic: ${topic.name}
Subject: ${subjectName}
Description: ${topic.description || 'N/A'}

Learning Objectives:
${objectives.map((obj, i) => `${i + 1}. ${obj.text}`).join('\n') || 'None specified'}

Success Criteria:
${objectives.flatMap(obj => obj.success_criteria || []).map((sc, i) => `${i + 1}. ${sc.text}`).join('\n') || 'None specified'}

Create a comprehensive lesson with:

1. EXPLANATION (200-300 words):
   - Student-friendly explanation of the concept in ${langLabel}
   - Connect to real-world examples
   - Build on prior knowledge
   - Use clear, simple language appropriate for the level

2. WORKED EXAMPLE:
   - One complete, step-by-step worked example in ${langLabel}
   - Show all reasoning and calculations
   - Highlight key decision points

3. COMMON MISTAKES (3-5 items):
   - List 3-5 common errors students make with this concept
   - Explain WHY each mistake happens
   - Brief tip on how to avoid each one

Return ONLY valid JSON, no markdown fences:
{
  "explanation": "...",
  "example": "...",
  "common_mistakes": ["...", "...", "..."]
}`;

    const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        modelId: modelId,
        history: [],
        language: language,
        maxTokens: 3000,
        userContext: { response_language: langLabel, format: 'json' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI generation failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();

    let generatedContent;
    try {
      const rawContent = aiData.content || aiData.data?.content || aiData;

      const stripFences = (s: string) => {
        let out = s.trim();
        out = out.replace(/^```(?:json)?\s*/i, '');
        out = out.replace(/```\s*$/i, '');
        out = out.replace(/```/g, '');
        return out.trim();
      };

      if (typeof rawContent === 'string') {
        const cleaned = stripFences(rawContent);
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        const jsonStr = firstBrace !== -1 && lastBrace > firstBrace
          ? cleaned.substring(firstBrace, lastBrace + 1)
          : cleaned;
        generatedContent = JSON.parse(jsonStr);
      } else {
        generatedContent = rawContent;
      }
    } catch (parseError) {
      console.error('[generate-lesson-content] Failed to parse AI response:', parseError);
      throw new Error('AI returned invalid JSON format');
    }

    const selectedPractice = practiceTasks
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(5, practiceTasks.length))
      .map(t => t.id);

    const selectedExit = exitTasks
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(2, exitTasks.length))
      .map(t => t.id);

    const lessonContent = {
      explanation: generatedContent.explanation,
      example: generatedContent.example,
      common_mistakes: generatedContent.common_mistakes || [],
      guided_practice: selectedPractice,
      exit_ticket: selectedExit,
      generated_at: new Date().toISOString(),
      generated_by_model: modelId,
      language: language,
    };

    const { error: updateError } = await supabase
      .from('topics')
      .update({ lesson_content: lessonContent })
      .eq('id', topicId);

    if (updateError) {
      throw new Error(`Failed to save lesson: ${updateError.message ?? JSON.stringify(updateError)}`);
    }

    return new Response(
      JSON.stringify({ success: true, lesson_content: lessonContent, topic_id: topicId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-lesson-content] Error:', error);
    const errorMessage = error instanceof Error
      ? error.message
      : (error as any)?.message ?? JSON.stringify(error) ?? 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, details: error instanceof Error ? error.stack : JSON.stringify(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
