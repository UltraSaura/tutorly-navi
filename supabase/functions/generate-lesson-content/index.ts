import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supported models by the AI runtime
const SUPPORTED_MODELS = ['gpt-5', 'gpt-4.1', 'deepseek-chat', 'claude-3-5-sonnet-20241022'];

// Map database model IDs to AI runtime model IDs
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

// Validate and resolve model to a supported one
function resolveModel(modelId: string | undefined): string {
  if (!modelId) {
    console.log('[resolveModel] No model provided, using gpt-5');
    return 'gpt-5';
  }
  
  const normalized = normalizeModelId(modelId);
  
  if (SUPPORTED_MODELS.includes(normalized)) {
    console.log(`[resolveModel] Using model: ${normalized}${normalized !== modelId ? ` (normalized from ${modelId})` : ''}`);
    return normalized;
  }
  
  console.warn(`[resolveModel] Model "${modelId}" (normalized: "${normalized}") is not supported. Falling back to gpt-5`);
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

    // Check admin or teacher role
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

    const { topicId, modelId: requestModelId } = await req.json();

    // Query the default model from database
    let adminSelectedModel = 'deepseek-chat';
    try {
      const { data: modelConfig, error: modelError } = await supabase
        .rpc('get_model_with_fallback')
        .single();

      const config = modelConfig as { default_model_id?: string } | null;
      if (!modelError && config?.default_model_id) {
        adminSelectedModel = config.default_model_id;
        console.log('[generate-lesson-content] Admin-configured model:', adminSelectedModel);
      }
    } catch (err) {
      console.warn('[generate-lesson-content] Error fetching model config:', err);
    }

    // Use provided modelId or fall back to admin-configured default
    const rawModelId = requestModelId || adminSelectedModel;
    const modelId = resolveModel(rawModelId);

    console.log('[generate-lesson-content] Model selection:', {
      requested: requestModelId,
      adminDefault: adminSelectedModel,
      resolved: modelId
    });

    if (!topicId) {
      return new Response(
        JSON.stringify({ error: 'Missing topicId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-lesson-content] Starting for topic:', topicId);

    // Fetch topic with curriculum info
    const { data: topic, error: topicError } = await supabase
      .from('learning_topics')
      .select(`
        id,
        name,
        description,
        curriculum_country_code,
        curriculum_level_code,
        curriculum_subject_id,
        curriculum_domain_id,
        curriculum_subdomain_id,
        learning_categories (
          learning_subjects (
            name
          )
        )
      `)
      .eq('id', topicId)
      .single();

    if (topicError || !topic) {
      throw new Error(`Topic not found: ${topicError?.message}`);
    }

    // Fetch linked objectives with success criteria
    const { data: topicObjectives, error: objError } = await supabase
      .from('topic_objectives')
      .select(`
        objective_id,
        objectives (
          id,
          text,
          success_criteria (
            id,
            text
          )
        )
      `)
      .eq('topic_id', topicId)
      .order('order_index');

    if (objError) throw objError;

    const objectives = (topicObjectives?.map(to => to.objectives).filter(Boolean) || []) as Array<{
      id: string;
      text: string;
      success_criteria?: Array<{ id: string; text: string }>;
    }>;
    const successCriteriaIds = objectives.flatMap(obj => 
      obj.success_criteria?.map(sc => sc.id) || []
    );

    // Fetch tasks for these success criteria
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .in('success_criterion_id', successCriteriaIds);

    const practiceTasks = tasks?.filter(t => t.type === 'practice') || [];
    const exitTasks = tasks?.filter(t => t.type === 'exit') || [];

    console.log('[generate-lesson-content] Fetched data:', {
      objectives: objectives.length,
      tasks: tasks?.length || 0,
      practice: practiceTasks.length,
      exit: exitTasks.length,
    });

    // Generate AI content
    const categories = topic.learning_categories as { learning_subjects?: { name: string } } | null;
    const subjectName = categories?.learning_subjects?.name || 'General';
    
    const prompt = `You are an expert educator creating lesson content for students.

Topic: ${topic.name}
Subject: ${subjectName}
Description: ${topic.description || 'N/A'}

Learning Objectives:
${objectives.map((obj, i) => `${i + 1}. ${obj.text}`).join('\n')}

Success Criteria:
${objectives.flatMap(obj => obj.success_criteria || []).map((sc, i) => `${i + 1}. ${sc.text}`).join('\n')}

Create a comprehensive lesson with:

1. EXPLANATION (200-300 words):
   - Student-friendly explanation of the concept
   - Connect to real-world examples
   - Build on prior knowledge
   - Use clear, simple language appropriate for the level

2. WORKED EXAMPLE:
   - One complete, step-by-step worked example
   - Show all reasoning and calculations
   - Highlight key decision points
   - Format as a clear narrative

3. COMMON MISTAKES (3-5 items):
   - List 3-5 common errors students make with this concept
   - Explain WHY each mistake happens
   - Brief tip on how to avoid each one

Return your response as JSON:
{
  "explanation": "...",
  "example": "...",
  "common_mistakes": ["...", "...", "..."]
}`;

    console.log('[generate-lesson-content] Calling AI with model:', modelId);

    // Call AI service with increased token limit for lesson content
    const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        modelId: modelId,
        history: [],
        language: 'en',
        maxTokens: 3000,  // Increased from default 800 to allow full lesson content
        userContext: {
          response_language: 'English',
          format: 'json'
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[generate-lesson-content] AI call failed:', errorText);
      throw new Error(`AI generation failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('[generate-lesson-content] AI response received');

    let generatedContent;
    try {
      const rawContent = aiData.content || aiData.data?.content || aiData;

      // Helper: strip leading/trailing markdown fences even if the closing fence is missing
      const stripFences = (s: string) => {
        let out = s.trim();
        out = out.replace(/^```(?:json)?\s*/i, '');
        out = out.replace(/```\s*$/i, '');
        // Also remove any trailing fence that might appear later
        out = out.replace(/```/g, '');
        return out.trim();
      };

      let jsonStr = '';

      if (typeof rawContent === 'string') {
        const cleaned = stripFences(rawContent);

        // Prefer extracting between braces (more robust than relying on ``` fences)
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
          console.log('[generate-lesson-content] Extracted JSON between braces');
        } else {
          // Fall back to using cleaned content as-is
          jsonStr = cleaned;
          console.log('[generate-lesson-content] Using cleaned content');
        }

        generatedContent = JSON.parse(jsonStr);
      } else {
        // Content is already an object
        generatedContent = rawContent;
      }

      console.log('[generate-lesson-content] Successfully parsed AI response');

    } catch (parseError) {
      console.error('[generate-lesson-content] Failed to parse AI response:', parseError);
      console.error('[generate-lesson-content] Raw AI data:', JSON.stringify(aiData, null, 2));
      throw new Error('AI returned invalid JSON format');
    }

    // Select tasks
    const selectedPractice = practiceTasks
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(5, practiceTasks.length))
      .map(t => t.id);

    const selectedExit = exitTasks
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(2, exitTasks.length))
      .map(t => t.id);

    // Assemble final lesson_content
    const lessonContent = {
      explanation: generatedContent.explanation,
      example: generatedContent.example,
      common_mistakes: generatedContent.common_mistakes || [],
      guided_practice: selectedPractice,
      exit_ticket: selectedExit,
      generated_at: new Date().toISOString(),
      generated_by_model: modelId,
    };

    console.log('[generate-lesson-content] Assembled lesson content');

    // Save to database
    const { error: updateError } = await supabase
      .from('learning_topics')
      .update({ lesson_content: lessonContent })
      .eq('id', topicId);

    if (updateError) {
      console.error('[generate-lesson-content] Database update failed:', updateError);
      throw updateError;
    }

    console.log('[generate-lesson-content] Successfully saved to database');

    return new Response(
      JSON.stringify({
        success: true,
        lesson_content: lessonContent,
        topic_id: topicId,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[generate-lesson-content] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
