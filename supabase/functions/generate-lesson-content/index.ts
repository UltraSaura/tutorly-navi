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

const CURRICULUM_MAP: Record<string, Record<string, string>> = {
  fr: {
    CP: "Programme Education Nationale francaise - Cycle 2, CP (6-7 ans)",
    CE1: "Programme Education Nationale francaise - Cycle 2, CE1 (7-8 ans)",
    CE2: "Programme Education Nationale francaise - Cycle 2, CE2 (8-9 ans)",
    CM1: "Programme Education Nationale francaise - Cycle 3, CM1 (9-10 ans)",
    CM2: "Programme Education Nationale francaise - Cycle 3, CM2 (10-11 ans)",
    "6EME": "Programme Education Nationale francaise - Cycle 3, 6eme (11-12 ans)",
    "5EME": "Programme Education Nationale francaise - College, 5eme (12-13 ans)",
    "4EME": "Programme Education Nationale francaise - College, 4eme (13-14 ans)",
  },
  be: {
    P3: "Programme enseignement fondamental belge - 3eme primaire (8-9 ans)",
    P4: "Programme enseignement fondamental belge - 4eme primaire (9-10 ans)",
    P5: "Programme enseignement fondamental belge - 5eme primaire (10-11 ans)",
    P6: "Programme enseignement fondamental belge - 6eme primaire (11-12 ans)",
  },
  ch: {
    CM1: "Plan d'etudes romand (PER) - 5eme HarmoS (9-10 ans)",
    CM2: "Plan d'etudes romand (PER) - 6eme HarmoS (10-11 ans)",
  },
};

const AGE_MAP: Record<string, string> = {
  CP: "6-7 ans",
  CE1: "7-8 ans",
  CE2: "8-9 ans",
  CM1: "9-10 ans",
  CM2: "10-11 ans",
  "6EME": "11-12 ans",
  "5EME": "12-13 ans",
  "4EME": "13-14 ans",
};

const WORD_BUDGET_MAP: Record<string, string> = {
  CP: "40-55",
  CE1: "50-65",
  CE2: "55-70",
  CM1: "60-90",
  CM2: "70-100",
  "6EME": "60-80",
  "5EME": "70-90",
  "4EME": "80-100",
};

function substituteVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
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

    const { topicId, modelId: requestModelId, language: requestLanguage } = await req.json();

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
    const language = requestLanguage === 'fr' ? 'fr' : 'en';
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

    const rawLevel = String(topic.curriculum_level_code ?? 'CM1').toUpperCase();
    const rawCountry = String(topic.curriculum_country_code ?? 'fr').toLowerCase();
    const responseLang = language === 'fr' ? 'francais' : 'English';
    const countryLabel = rawCountry === 'fr'
      ? 'France'
      : rawCountry === 'be'
        ? 'Belgique'
        : rawCountry === 'ch'
          ? 'Suisse'
          : rawCountry;

    const curriculumKey = rawLevel in (CURRICULUM_MAP[rawCountry] ?? {})
      ? rawLevel
      : Object.keys(CURRICULUM_MAP[rawCountry] ?? {}).find((key) => key.toUpperCase() === rawLevel) ?? rawLevel;
    const curriculum = CURRICULUM_MAP[rawCountry]?.[curriculumKey] ?? `Niveau ${rawLevel} - ${countryLabel}`;
    const ageGroup = AGE_MAP[rawLevel] ?? '9-10 ans';
    const wordBudget = WORD_BUDGET_MAP[rawLevel] ?? '40-60';

    const promptVariables: Record<string, string> = {
      curriculum,
      grade_level: rawLevel,
      age_group: ageGroup,
      word_budget: wordBudget,
      country: countryLabel,
      response_language: responseLang,
      learning_style: 'visual',
      subject: subjectName,
      topic_name: topic.name,
      topic_description: topic.description ?? '',
      learning_objectives: objectives.map((objective) => objective.text).join(', ') || 'Non precises',
    };

    console.log('[generate-lesson-content] Curriculum context:', {
      curriculum,
      grade_level: rawLevel,
      age_group: ageGroup,
      word_budget: wordBudget,
      language,
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let promptTemplate: string | null = null;
    try {
      const { data: templateRow } = await supabaseAdmin
        .from('prompt_templates')
        .select('prompt_content')
        .eq('is_active', true)
        .eq('usage_type', 'lesson_generation')
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (templateRow?.prompt_content) {
        promptTemplate = templateRow.prompt_content;
        console.log('[generate-lesson-content] Loaded prompt from prompt_templates table');
      } else {
        console.warn('[generate-lesson-content] No active lesson_generation prompt in DB - using fallback');
      }
    } catch (promptErr) {
      console.warn('[generate-lesson-content] Failed to load prompt from DB (non-fatal):', promptErr);
    }

    const FALLBACK_PROMPT = `Tu es un professeur expert creant une lecon pour des eleves de {{grade_level}} ({{age_group}}) en {{country}}.

Programme : {{curriculum}}
Matiere : {{subject}}
Sujet : {{topic_name}}
Description : {{topic_description}}
Objectifs : {{learning_objectives}}

REGLES : Reponds en {{response_language}}. Maximum {{word_budget}} mots pour l'explication. Exemples du quotidien d'un enfant.

REPONDS EN JSON VALIDE UNIQUEMENT :
{
  "explanation": "{{word_budget}} mots max en {{response_language}}",
  "example": "Etape 1: ...\nEtape 2: ...\nEtape 3: ...",
  "common_mistakes": [
    { "mistake": "erreur", "why": "raison" }
  ]
}`;

    const prompt = substituteVariables(
      promptTemplate ?? FALLBACK_PROMPT,
      promptVariables
    );

    const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        modelId: modelId,
        history: [],
        language: language,
        maxTokens: 1800,
        userContext: {
          grade_level: rawLevel,
          age_group: ageGroup,
          curriculum: curriculum,
          country: countryLabel,
          response_language: responseLang,
          learning_style: 'visual',
          format: 'json',
        }
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

    const rawMistakes = generatedContent.common_mistakes || [];
    const normalizedMistakes = rawMistakes.map((mistake: any) => {
      if (typeof mistake === 'string') return { mistake, why: '' };
      if (typeof mistake === 'object' && mistake !== null) {
        return { mistake: mistake.mistake || mistake.tip || '', why: mistake.why || '' };
      }
      return { mistake: String(mistake), why: '' };
    });

    const lessonContent = {
      explanation: generatedContent.explanation,
      example: generatedContent.example,
      common_mistakes: normalizedMistakes,
      guided_practice: selectedPractice,
      exit_ticket: selectedExit,
      generated_at: new Date().toISOString(),
      generated_by_model: modelId,
      curriculum_level: rawLevel,
      curriculum_country: rawCountry,
      generated_language: language,
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
