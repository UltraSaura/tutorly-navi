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
    "3EME": "Programme Education Nationale francaise - College, 3eme (14-15 ans)",
    "SECONDE": "Programme Education Nationale francaise - Lycee, Seconde (15-16 ans)",
    "PREMIERE": "Programme Education Nationale francaise - Lycee, Premiere (16-17 ans)",
    "TERMINALE": "Programme Education Nationale francaise - Lycee, Terminale (17-18 ans)",
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
  "3EME": "14-15 ans",
  "SECONDE": "15-16 ans",
  "PREMIERE": "16-17 ans",
  "TERMINALE": "17-18 ans",
};

const WORD_BUDGET_MAP: Record<string, string> = {
  CP: '40-55',  CE1: '50-65',  CE2: '55-70',
  CM1: '60-90', CM2: '70-100',
  '6EME': '100-130', '5EME': '110-140',
  '4EME': '120-150', '3EME': '120-150',
  SECONDE: '130-160', PREMIERE: '140-170', TERMINALE: '140-170',
  P3: '55-70',  P4: '60-90',   P5: '70-100',  P6: '80-110',
  '5H': '60-90', '6H': '70-100', '7H': '80-110',
  '8H': '90-120', '9H': '100-130', '10H': '110-150',
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

    const body = await req.json();
    const { topicId, modelId: requestModelId, language: requestLanguage, difficulty_level: requestDifficultyLevel, step_name: requestStepName } = body;

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
    const tasks: any[] = [];
    const practiceTasks = tasks.filter(t => t.type === 'practice');
    const exitTasks = tasks.filter(t => t.type === 'exit');

    const rawLevel = String(topic.curriculum_level_code ?? 'CM1').toUpperCase();

    // Resolve curriculum edition and fetch objectives for this topic's level+subject
    try {
      const supabaseAdminEarly = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Map rawLevel (uppercase from topic) to the two formats we need
      const levelRpcMap: Record<string, string> = {
        'CP': 'CP', 'CE1': 'CE1', 'CE2': 'CE2',
        'CM1': 'CM1', 'CM2': 'CM2',
        '6EME': '6e', '5EME': '5e', '4EME': '4e', '3EME': '3e',
      };
      const levelDbMap: Record<string, string> = {
        'CP': 'cp', 'CE1': 'ce1', 'CE2': 'ce2',
        'CM1': 'cm1', 'CM2': 'cm2',
        '6EME': '6eme', '5EME': '5eme', '4EME': '4eme', '3EME': '3eme',
      };
      const rpcLevel = levelRpcMap[rawLevel] ?? rawLevel;
      const dbLevel  = levelDbMap[rawLevel]  ?? rawLevel.toLowerCase();

      // Get subject slug from curriculum_subject_id on the topic
      const { data: subjectRow } = await supabaseAdminEarly
        .from('subjects')
        .select('slug')
        .eq('id', topic.curriculum_subject_id)
        .maybeSingle();

      const subjectSlug = subjectRow?.slug;

      if (subjectSlug) {
        let editionId: string | null = null;

        // Primary: use resolve_edition RPC (français + maths have applicability rows)
        const { data: resolvedId } = await supabaseAdminEarly.rpc('resolve_edition', {
          p_level: rpcLevel,
          p_subject: subjectSlug,
          p_track: null,
        }).maybeSingle().catch(() => ({ data: null }));
        editionId = resolvedId as string | null;

        // Fallback for subjects without applicability rows (histoire, géo, sciences, emc)
        if (!editionId) {
          const cycleMap: Record<string, string> = {
            'cp': 'cycle 2', 'ce1': 'cycle 2', 'ce2': 'cycle 2',
            'cm1': 'cycle 3', 'cm2': 'cycle 3', '6eme': 'cycle 3',
          };
          const cycle = cycleMap[dbLevel];
          if (cycle) {
            const { data: edition } = await supabaseAdminEarly
              .from('curriculum_edition')
              .select('id')
              .eq('subject', subjectSlug)
              .eq('cycle', cycle)
              .eq('status', 'active')
              .maybeSingle();
            editionId = edition?.id ?? null;
          }
        }

        if (editionId) {
          // Get domain IDs — scope to the topic's domain if specified
          let domainIds: string[] = [];
          if (topic.curriculum_domain_id) {
            domainIds = [topic.curriculum_domain_id];
          } else {
            const { data: domainRows } = await supabaseAdminEarly
              .from('domains')
              .select('id')
              .eq('edition_id', editionId);
            domainIds = (domainRows ?? []).map((d: { id: string }) => d.id);
          }

          if (domainIds.length > 0) {
            // Fetch objectives for this level in this edition
            let objQuery = supabaseAdminEarly
              .from('objectives')
              .select('text')
              .eq('level', dbLevel)
              .in('domain_id_uuid', domainIds)
              .limit(12);

            // Narrow to subdomain if topic specifies one
            if (topic.curriculum_subdomain_id) {
              objQuery = objQuery.eq('subdomain_id_uuid', topic.curriculum_subdomain_id);
            }

            const { data: editionObjectives } = await objQuery;
            if (editionObjectives?.length) {
              objectives.push(...(editionObjectives as Array<{ text: string }>));
            }
          }
        }
      }
    } catch (curriculumErr) {
      // Non-fatal — lesson generation continues without objectives if resolution fails
      console.warn('[generate-lesson-content] Curriculum resolution failed (non-fatal):', curriculumErr);
    }

    const categories = topic.learning_categories as { subjects?: { name: string } } | null;
    const subjectName = categories?.subjects?.name || 'General';

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
      if (templateRow?.prompt_content) promptTemplate = templateRow.prompt_content;
    } catch { /* non-fatal */ }

    const FALLBACK_PROMPT = `Tu es un professeur excellent et tres clair. Tu crées une leçon pour des eleves de {{grade_level}} ({{age_group}}) en {{country}}.

Programme : {{curriculum}}
Matiere : {{subject}}
Sujet : {{topic_name}}
Description : {{topic_description}}
Objectifs : {{learning_objectives}}
{{difficulty_instruction}}

MISSION PEDAGOGIQUE
- Réponds en {{response_language}}.
- Enseigne comme un vrai professeur : simple, progressif, rassurant, précis.
- Explique toujours d'abord l'idée, puis la methode, puis l'exemple.
- Ne suppose jamais qu'un symbole, une notation ou un mot technique est déjà compris.
- Si tu utilises une notation mathematique, explique-la clairement AVANT ou AU MOMENT où tu l'utilises.
- Pour un niveau 1 ou une première étape, évite les explications trop condensées, trop symboliques ou trop abstraites.
- En géométrie, définis clairement les points, segments, droites parallèles, rapports et longueurs avant d'écrire une égalité de rapports.
- Pour les opérations, chaque étape doit dire l'action à faire : calculer, simplifier, transformer, trouver, comparer, remplacer, additionner, soustraire, etc.

REGLES DE CLARTE
- L'explication principale doit faire maximum {{word_budget}} mots.
- Utilise des phrases courtes.
- Commence par ce que l'élève cherche à comprendre ou à faire.
- Explique le "pourquoi", pas seulement le "quoi".
- Donne un ton naturel de professeur, pas un résumé sec.
- N'écris pas une liste de formules sans explication.
- Si une formule est utile, introduis-la avec une phrase simple qui dit à quoi elle sert.

REGLES POUR L'EXEMPLE RESOLU
- Produis "example_steps" avec 4 à 6 étapes si le sujet s'y prête.
- Chaque étape doit contenir :
  - "action" : un titre d'action court et clair, pas un mot isolé. Exemple : "Trouver le dénominateur commun", "Additionner les deux fractions", "Écrire les rapports de Thalès".
  - "explanation" : une phrase complète qui explique ce qu'on fait et pourquoi, avec un langage simple.
  - "math" : le calcul, l'égalité, la transformation ou la relation utile pour cette étape.
  - "why" : facultatif, une précision très courte si cela aide l'élève à comprendre.
- Tu peux aussi renseigner "label" et "line" pour compatibilité, mais la priorité est de remplir clairement "action", "explanation" et "math".
- N'écris pas des titres vagues comme "Transformation", "Addition", "Simplification" sans précision.
- Chaque étape doit être compréhensible seule par un élève.
- Si le sujet est plutôt conceptuel, l'exemple doit quand même guider l'élève avec des actions concrètes.

VOCABULAIRE
- Ajoute 0 à 3 éléments de "vocabulary" seulement si cela aide vraiment.
- Chaque définition doit être simple, courte et utile pour l'élève.

ERREURS FREQUENTES
- Donne 1 à 2 erreurs fréquentes.
- Pour chaque erreur, explique clairement pourquoi c'est une erreur et comment l'éviter.

REPONDS EN JSON VALIDE UNIQUEMENT :
{
  "explanation": "<explication claire, simple, progressive, {{word_budget}} mots max>",
  "example": "<résumé très court de l'exemple résolu>",
  "example_steps": [
    {
      "action": "<action claire>",
      "explanation": "<phrase complète qui explique ce qu'on fait et pourquoi>",
      "math": "<calcul, égalité ou relation utile>",
      "why": "<précision courte facultative>",
      "label": "<optionnel: même idée que action>",
      "line": "<optionnel: phrase compacte pour compatibilité>"
    }
  ],
  "vocabulary": [
    { "term": "<mot utile>", "definition": "<définition simple>" }
  ],
  "common_mistakes": [{ "mistake": "<erreur fréquente>", "why": "<pourquoi c'est faux et comment l'éviter>" }]
}`;

    // ── Helper: call ai-chat and return parsed JSON content ──────────────
    const callAI = async (message: string, maxTokens: number) => {
      const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message, modelId, history: [], language, maxTokens,
          userContext: { grade_level: rawLevel, age_group: ageGroup, curriculum, country: countryLabel,
                         response_language: responseLang, learning_style: 'visual', format: 'json' },
        }),
      });
      if (!res.ok) throw new Error(`AI generation failed: ${await res.text()}`);
      const data = await res.json();
      const raw = data.content || data.data?.content || data;
      const stripFences = (s: string) => s.trim()
        .replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').replace(/```/g, '').trim();
      if (typeof raw === 'string') {
        const cleaned = stripFences(raw);
        const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
        return JSON.parse(start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned);
      }
      return raw;
    };

    // ── Helper: normalize an AI "quiz" object into a renderable SingleQ ──
    // Returns undefined when malformed (≠4 choices, ≠1 correct, missing text)
    // so the frontend simply skips that level's "Teste-toi" card.
    const buildQuiz = (raw: any, difficultyLevel: number): Record<string, unknown> | undefined => {
      if (!raw || typeof raw !== 'object') return undefined;
      if (!raw.prompt || typeof raw.prompt !== 'string') return undefined;
      const rawChoices = Array.isArray(raw.choices) ? raw.choices : [];
      if (rawChoices.length !== 4) return undefined;
      const choices = rawChoices.map((c: any, i: number) => ({
        id: String.fromCharCode(97 + i), // a, b, c, d
        label: typeof c === 'string' ? c : String(c?.label ?? c?.text ?? ''),
        correct: typeof c === 'object' && c !== null && (c.correct === true || c.is_correct === true),
      }));
      if (choices.some((c) => !c.label.trim())) return undefined;
      if (choices.filter((c) => c.correct).length !== 1) return undefined;
      return {
        id: `lesson-q-l${difficultyLevel}`,
        kind: 'single',
        prompt: raw.prompt.trim(),
        choices,
      };
    };

    const normalizeExampleSteps = (rawExampleSteps: any): Array<Record<string, string>> => {
      if (!Array.isArray(rawExampleSteps)) return [];
      return rawExampleSteps
        .map((step: any) => {
          if (!step || typeof step !== 'object') return null;
          const normalized = {
            label: typeof step.label === 'string' ? step.label.trim() : '',
            line: typeof step.line === 'string' ? step.line.trim() : '',
            action: typeof step.action === 'string' ? step.action.trim() : '',
            explanation: typeof step.explanation === 'string' ? step.explanation.trim() : '',
            math: typeof step.math === 'string' ? step.math.trim() : '',
            why: typeof step.why === 'string' ? step.why.trim() : '',
          };
          if (!normalized.label && normalized.action) normalized.label = normalized.action;
          if (!normalized.line) {
            normalized.line = [normalized.explanation, normalized.math].filter(Boolean).join(' : ').trim();
          }
          if (!normalized.label && !normalized.line && !normalized.action && !normalized.explanation && !normalized.math) return null;
          return normalized;
        })
        .filter(Boolean) as Array<Record<string, string>>;
    };

    // ── Helper: build lesson content object from AI response ─────────────
    const buildLessonContent = (generatedContent: any, stepName: string, difficultyLevel: number) => {
      const rawMistakes = generatedContent.common_mistakes || [];
      const normalizedMistakes = rawMistakes.map((m: any) => {
        if (typeof m === 'string') return { mistake: m, why: '' };
        if (typeof m === 'object' && m !== null) return { mistake: m.mistake || m.tip || '', why: m.why || '' };
        return { mistake: String(m), why: '' };
      });
      const normalizedExampleSteps = normalizeExampleSteps(generatedContent.example_steps);
      const quiz = buildQuiz(generatedContent.quiz, difficultyLevel);
      return {
        vocabulary: generatedContent.vocabulary || [],
        explanation: generatedContent.explanation,
        examples: generatedContent.examples || [],
        example: generatedContent.example,
        ...(normalizedExampleSteps.length > 0 ? { example_steps: normalizedExampleSteps } : {}),
        common_mistakes: normalizedMistakes,
        ...(quiz ? { quiz } : {}),
        generated_at: new Date().toISOString(),
        generated_by_model: modelId,
        curriculum_level: rawLevel,
        curriculum_country: rawCountry,
        generated_language: language,
        ...(stepName ? { step_name: stepName, difficulty_level: difficultyLevel } : {}),
      };
    };

    // ── Helper: generate content for one step ────────────────────────────
    const generateOneStep = async (stepName: string, stepFocus: string, difficultyLevel: number, totalSteps: number) => {
      const difficultyInstruction = stepName
        ? `CONTEXTE DE PROGRESSION (étape ${difficultyLevel}/${totalSteps}) :
Tu génères le contenu pour l'étape "${stepName}".
Focus de cette étape : ${stepFocus}
Adapte la complexité en conséquence — les étapes suivantes approfondiront le sujet.`
        : '';
      const promptVariables: Record<string, string> = {
        curriculum, grade_level: rawLevel, age_group: ageGroup, word_budget: wordBudget,
        country: countryLabel, response_language: responseLang, learning_style: 'visual',
        subject: subjectName, topic_name: topic.name, topic_description: topic.description ?? '',
        learning_objectives: objectives.map(o => o.text).join(', ') || 'Non précisés',
        difficulty_level: String(difficultyLevel), step_name: stepName,
        difficulty_instruction: difficultyInstruction,
      };
      const quizInstruction = `

EN PLUS de tout le reste, ajoute dans le JSON une question "teste-toi" qui vérifie la compréhension de CETTE étape précise${stepName ? ` ("${stepName}")` : ''}.
Clé "quiz", format STRICT :
"quiz": {
  "prompt": "<question courte, claire et concrète, adaptée à ${ageGroup}>",
  "choices": [
    {"label": "<la bonne réponse>", "correct": true},
    {"label": "<distracteur plausible>", "correct": false},
    {"label": "<distracteur plausible>", "correct": false},
    {"label": "<distracteur plausible>", "correct": false}
  ]
}
RÈGLES : EXACTEMENT 4 choix, EXACTEMENT une seule "correct": true, mélange la position de la bonne réponse, distracteurs crédibles (erreurs typiques).`;
      const prompt = substituteVariables(promptTemplate ?? FALLBACK_PROMPT, promptVariables) + quizInstruction;
      const generated = await callAI(prompt, 2600);
      return buildLessonContent(generated, stepName, difficultyLevel);
    };

    // ── Step 1: Planning — AI decides step names, grade level enforces minimum count ──
    let plannedSteps: Array<{ name: string; focus: string }> = [];

    // Grade-level minimum step counts (hard floor — AI can add more, never fewer)
    const gradeMin = ['CP','CE1'].includes(rawLevel) ? 1
      : ['CE2','CM1','CM2'].includes(rawLevel) ? 2
      : 2; // 6EME–3EME always at least 2 steps

    // Default step name sets per grade band (used as fallback when AI fails)
    const defaultStepsByGrade = (): Array<{ name: string; focus: string }> => {
      if (['CP','CE1'].includes(rawLevel)) {
        return [{ name: 'Découverte', focus: 'Comprendre la notion de base' }];
      }
      if (['CE2','CM1','CM2'].includes(rawLevel)) {
        return [
          { name: 'Comprendre', focus: 'Découvrir et comprendre la notion' },
          { name: 'Appliquer', focus: 'Mettre en pratique avec des exercices' },
        ];
      }
      // Collège: 6ème–3ème
      return [
        { name: 'Maîtriser les bases', focus: 'Comprendre et savoir utiliser les définitions et propriétés fondamentales' },
        { name: 'Résoudre des problèmes', focus: 'Appliquer les notions à des situations variées et plus complexes' },
      ];
    };

    // Only plan when no explicit step_name was passed in the request
    if (!requestStepName) {
      const objectivesText = objectives.map(o => o.text).join('\n- ') || 'Non précisés';
      const gradeDefault = gradeMin; // use the minimum as the target for the AI prompt

      const planningPrompt = `Tu es un expert pédagogique pour ${curriculum} (${ageGroup}).

Sujet : "${topic.name}"
Niveau : ${rawLevel}
Objectifs du programme :
- ${objectivesText}

Découpe ce sujet en ${gradeDefault} à ${Math.min(gradeDefault + 1, 3)} étapes pédagogiques progressives.
IMPORTANT : tu DOIS retourner EXACTEMENT ${gradeDefault} étapes minimum (${rawLevel} oblige).
Maximum absolu : 3 étapes.

Chaque étape doit avoir un nom COURT et SPÉCIFIQUE au sujet (pas "Découverte" générique — ex: "Comprendre le coefficient directeur", "Résoudre des équations").

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
{"steps":[{"name":"<nom court spécifique en français>","focus":"<ce qu'on travaille ici en une phrase>"}]}`;

      try {
        const planData = await callAI(planningPrompt, 400);
        if (Array.isArray(planData?.steps) && planData.steps.length > 0) {
          plannedSteps = planData.steps.slice(0, 3);
          console.log('[generate-lesson-content] AI planned steps:', plannedSteps.map((s: any) => s.name));
        }
      } catch (planErr) {
        console.warn('[generate-lesson-content] Planning failed, using grade defaults:', planErr);
      }

      // Enforce grade-level minimum: if AI returned fewer steps than required, use defaults
      if (plannedSteps.length < gradeMin) {
        console.log(`[generate-lesson-content] AI returned ${plannedSteps.length} step(s), minimum is ${gradeMin} — using grade defaults`);
        plannedSteps = defaultStepsByGrade();
      }
    } else {
      // Explicit step_name passed — treat as a single targeted generation
      plannedSteps = [{ name: requestStepName, focus: '' }];
    }

    // ── Step 2: Generate content for each planned step ───────────────────
    const generatedSteps: Record<string, unknown>[] = [];
    for (let i = 0; i < plannedSteps.length; i++) {
      const step = plannedSteps[i];
      const content = await generateOneStep(step.name, step.focus, i + 1, plannedSteps.length);
      generatedSteps.push(content as Record<string, unknown>);
    }

    // ── Step 3: Build final content structure ────────────────────────────
    let finalContent: Record<string, unknown>;

    if (generatedSteps.length === 1) {
      // Single step — save as flat content (no steps[] wrapper)
      finalContent = generatedSteps[0];
    } else {
      // Multiple steps — save under steps[]
      // If explicit step_name was provided, merge into existing steps[]
      if (requestStepName) {
        const { data: existingTopic } = await supabase
          .from('topics').select('lesson_content').eq('id', topicId).single();
        const existing = (existingTopic?.lesson_content as Record<string, unknown>) ?? {};
        const existingSteps: Record<string, unknown>[] = Array.isArray(existing.steps)
          ? (existing.steps as Record<string, unknown>[]) : [];
        const stepIdx = existingSteps.findIndex((s) => (s as any).step_name === requestStepName);
        const updatedSteps = stepIdx >= 0
          ? existingSteps.map((s, i) => i === stepIdx ? generatedSteps[0] : s)
          : [...existingSteps, generatedSteps[0]];
        updatedSteps.sort((a: any, b: any) => (a.difficulty_level ?? 0) - (b.difficulty_level ?? 0));
        finalContent = { ...existing, steps: updatedSteps };
      } else {
        finalContent = { steps: generatedSteps };
      }
    }

    const { error: updateError } = await supabase
      .from('topics')
      .update({ lesson_content: finalContent })
      .eq('id', topicId);

    if (updateError) {
      throw new Error(`Failed to save lesson: ${updateError.message ?? JSON.stringify(updateError)}`);
    }

    return new Response(
      JSON.stringify({ success: true, lesson_content: finalContent, topic_id: topicId }),
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
