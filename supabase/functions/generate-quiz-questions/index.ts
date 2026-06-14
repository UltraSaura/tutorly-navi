import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AGE_MAP: Record<string, string> = {
  CP: '6-7 ans',   CE1: '7-8 ans',   CE2: '8-9 ans',
  CM1: '9-10 ans', CM2: '10-11 ans',
  '6EME': '11-12 ans', '5EME': '12-13 ans',
  '4EME': '13-14 ans', '3EME': '14-15 ans',
  SECONDE: '15-16 ans', PREMIERE: '16-17 ans', TERMINALE: '17-18 ans',
  P3: '8-9 ans', P4: '9-10 ans', P5: '10-11 ans', P6: '11-12 ans',
};

function getAgeGroup(levelCode: string): string {
  return AGE_MAP[levelCode.toUpperCase()] ?? AGE_MAP[levelCode] ?? '9-10 ans';
}

function buildPrompt(params: {
  difficultyLevel: number;
  stepName:        string;
  gradeLevel:      string;
  ageGroup:        string;
  topicName:       string;
  count:           number;
  responseLang:    string;
}): string {
  const { difficultyLevel, stepName, gradeLevel, ageGroup, topicName, count, responseLang } = params;
  const pct = `${difficultyLevel}/4`;

  const difficultyGuidance = ([
    '',
    `NIVEAU 1/4 — ${stepName} :
     - Questions de RECONNAISSANCE et de lecture directe du concept
     - Utilise uniquement les exemples les plus simples et concrets pour ${ageGroup}
     - 4 choix (A/B/C/D), réponse clairement distincte des distracteurs
     - Pas de calcul complexe — juste la compréhension de base`,
    `NIVEAU 2/4 — ${stepName} :
     - Questions d'APPLICATION directe du concept
     - Légèrement plus de variété dans les contextes
     - Les distracteurs représentent des erreurs fréquentes à ce niveau
     - Peut inclure des questions avec mini-contexte (1 phrase)`,
    `NIVEAU 3/4 — ${stepName} :
     - Questions de COMPARAISON, d'ORDRE et de cas moins évidents
     - Inclure des questions qui nécessitent un raisonnement en 2 temps
     - Les distracteurs sont des erreurs de raisonnement réelles
     - Peut inclure des équivalences ou des généralisations simples`,
    `NIVEAU 4/4 — ${stepName} :
     - Questions COMPLEXES nécessitant un raisonnement multi-étapes
     - Contextes variés — l'élève doit transférer ses connaissances
     - Les distracteurs sont des erreurs de raisonnement sophistiquées
     - Peut inclure des cas inversés (trouver le tout connaissant la partie)`,
  ])[difficultyLevel] ?? '';

  return `Tu es un expert en éducation spécialisé dans la création d'exercices pédagogiques.

CONTEXTE ÉLÈVE :
- Niveau scolaire : ${gradeLevel} (${ageGroup})
- Sujet de la leçon : ${topicName}
- Étape de progression : ${stepName} (difficulté ${pct})

${difficultyGuidance}

ADAPTE chaque question au niveau ${gradeLevel} :
- Vocabulaire approprié pour ${ageGroup}
- Exemples tirés du quotidien de ces élèves
- Complexité mathématique correspondant à ${gradeLevel}

Génère exactement ${count} questions en ${responseLang}.
RÉPONDS UNIQUEMENT avec un tableau JSON valide. Aucun texte avant ou après.

Format de chaque question :
{
  "kind": "single",
  "prompt": "Texte de la question",
  "choices": [
    {"id": "a", "text": "Option A", "correct": false},
    {"id": "b", "text": "Option B", "correct": true},
    {"id": "c", "text": "Option C", "correct": false},
    {"id": "d", "text": "Option D", "correct": false}
  ]
}

Règles absolues :
- Exactement 1 réponse correcte (correct: true) par question
- Les 3 distracteurs sont plausibles mais clairement incorrects
- Toutes les questions portent sur : ${topicName}
- NE JAMAIS répéter la même question
- Langue : ${responseLang}`;
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

    const body = await req.json();
    const {
      topicId,
      bankId,
      difficultyLevel = 1,
      stepName        = '',
      topicName,
      count           = 10,
      language        = 'fr',
      gradeLevel      = '',
    } = body;

    if (!topicId || !bankId || !topicName) {
      return new Response(
        JSON.stringify({ error: 'topicId, bankId and topicName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let resolvedLevel = gradeLevel;
    if (!resolvedLevel) {
      const { data: topic } = await supabaseAdmin
        .from('topics')
        .select('curriculum_level_code')
        .eq('id', topicId)
        .single();
      resolvedLevel = topic?.curriculum_level_code ?? 'CM1';
    }

    const responseLang = language === 'fr' ? 'français' : 'english';
    const ageGroup     = getAgeGroup(resolvedLevel);

    const prompt = buildPrompt({
      difficultyLevel,
      stepName:    stepName || `Étape ${difficultyLevel}`,
      gradeLevel:  resolvedLevel,
      ageGroup,
      topicName,
      count,
      responseLang,
    });

    const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message:   prompt,
        history:   [],
        language,
        maxTokens: 2500,
        userContext: {
          grade_level: resolvedLevel,
          age_group:   ageGroup,
          format:      'json',
        },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI call failed: ${errorText}`);
    }

    const aiData  = await aiResponse.json();
    const rawText = aiData.content || aiData.data?.content || aiData.message || '';

    let jsonStr = typeof rawText === 'string'
      ? rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      : JSON.stringify(rawText);

    const arrayStart = jsonStr.indexOf('[');
    const arrayEnd   = jsonStr.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      jsonStr = jsonStr.slice(arrayStart, arrayEnd + 1);
    }

    const questions: any[] = JSON.parse(jsonStr);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI returned empty or invalid questions array');
    }

    const { data: existing } = await supabaseAdmin
      .from('quiz_bank_questions')
      .select('position')
      .eq('bank_id', bankId)
      .order('position', { ascending: false })
      .limit(1);

    const startPos = (existing?.[0]?.position ?? 0) + 1;

    const rows = questions.map((q: any, i: number) => ({
      id:         crypto.randomUUID(),
      bank_id:    bankId,
      position:   startPos + i,
      difficulty: difficultyLevel,
      payload:    q,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('quiz_bank_questions')
      .insert(rows);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, inserted: rows.length, gradeLevel: resolvedLevel }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[generate-quiz-questions] error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
