import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { validateLessonV21 } from './lesson-v21-contract.ts';

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

    const objectives: Array<{ id: string; text: string }> = [];
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
              .select('id,text')
              .eq('level', dbLevel)
              .in('domain_id_uuid', domainIds)
              .limit(12);

            // Narrow to subdomain if topic specifies one
            if (topic.curriculum_subdomain_id) {
              objQuery = objQuery.eq('subdomain_id_uuid', topic.curriculum_subdomain_id);
            }

            const { data: editionObjectives } = await objQuery;
            if (editionObjectives?.length) {
              objectives.push(...(editionObjectives as Array<{ id: string; text: string }>));
            }
          }
        }
      }
    } catch (curriculumErr) {
      // Non-fatal — lesson generation continues without objectives if resolution fails
      console.warn('[generate-lesson-content] Curriculum resolution failed (non-fatal):', curriculumErr);
    }
    // Topic links are the authoritative objective source; use them when edition
    // resolution is unavailable so V2.1 never invents or drops objective IDs.
    if (objectives.length === 0) {
      const objectiveClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: linked } = await objectiveClient
        .from('topic_objective_links')
        .select('objective_id, objective_id_uuid')
        .eq('topic_id', topicId)
        .order('order_index');
      for (const row of (linked ?? []) as any[]) {
        const { data: item } = await objectiveClient.from('objectives').select('id,text').or(`id.eq.${row.objective_id},id_new.eq.${row.objective_id_uuid}`).maybeSingle();
        if (item?.id && item?.text) objectives.push({ id: String(item.id), text: String(item.text) });
      }
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

    const FALLBACK_PROMPT = `Tu es un professeur expert creant une lecon pour des eleves de {{grade_level}} ({{age_group}}) en {{country}}.

Programme : {{curriculum}}
Matiere : {{subject}}
Sujet : {{topic_name}}
Description : {{topic_description}}
Objectifs : {{learning_objectives}}
{{difficulty_instruction}}

REGLES : Reponds en {{response_language}}. Maximum {{word_budget}} mots pour l'explication. Exemples du quotidien d'un enfant.

REPONDS EN JSON VALIDE UNIQUEMENT :
{
  "explanation": "{{word_budget}} mots max en {{response_language}}",
  "example": "Etape 1: ...\nEtape 2: ...\nEtape 3: ...",
  "common_mistakes": [{ "mistake": "erreur", "why": "raison" }]
}`;

    const FALLBACK_V2_PROMPT = `LESSON GENERATOR V2
Tu es le concepteur expert de leçons interactives de Stuwy. Conçois une séquence qui fait construire la compréhension, fait raisonner l'élève, donne un retour ciblé et vérifie le transfert. Retourne uniquement un JSON valide, sans Markdown.
Contexte : curriculum={{curriculum}}; pays={{country}}; niveau={{grade_level}}; âge={{age_group}}; matière={{subject}}; sujet={{topic_name}}; description={{topic_description}}; objectifs={{learning_objectives}}; langue={{response_language}}; préférence={{learning_style}}.
Adapte le registre à l'âge (R1 concret, R2 modèle puis règle, R3/R4 raisonnement formel). Pour les mathématiques, établis le sens avant la procédure. Identifie les prérequis et les erreurs plausibles. La séquence doit contenir une vraie interaction avant la révélation et une vérification de maîtrise par transfert. Utilise des visuels seulement lorsqu'ils représentent le concept.
Le JSON doit respecter exactement cette structure :
{"version":"2.0","lesson_goal":"...","success_criteria":["..."],"prerequisites":[{"id":"...","description":"...","check_question":"...","expected_answer":"...","remediation_hint":"..."}],"sequence":[{"id":"...","type":"hook|concept|visual|prediction|guided_example|student_try|feedback_checkpoint|contrast|rule|worked_example|reflection|mastery_check", "...": "champs correspondant au type"}],"misconceptions":[{"id":"...","description":"...","detect_if":"...","feedback":"...","remediation_strategy":"..."}],"mastery":{"skills":["..."],"threshold":0.8}}
Blocs : hook/concept {title,content}; visual {title,content,visual:{kind,data}} avec kind number_line|groups|timeline|clock|comparison|part_whole|table|equation|diagram|sequence; prediction {question,choices,correct_answer,hint,explanation}; guided_example {context,steps:[{instruction,representation,reason}]}; student_try ou feedback_checkpoint {question,answer_type,choices,correct_answer,hints,success_feedback,error_feedback}; contrast {title,left,right,explanation}; rule {title,content,representation}; worked_example {context,steps,conclusion}; reflection {question,expected_idea}; mastery_check {questions:[{id,question,answer_type,choices,correct_answer,skill,difficulty,success_feedback,error_feedback}]}.
Pour CM2, crée environ 6 à 10 blocs, avec au moins un prérequis, une représentation conceptuelle, une prédiction, un essai guidé, une rétroaction et 2 à 4 questions de maîtrise. Ne révèle jamais la réponse avant la soumission. Exactitude et programme priment. Inclure les champs requis, omettre les champs inutiles. JSON uniquement.`;
    if (!promptTemplate) promptTemplate = FALLBACK_V2_PROMPT;
    const isV2Prompt = /LESSON GENERATOR V2(?:\.1)?/i.test(promptTemplate)
      || promptTemplate.includes('version":"2.0')
      || promptTemplate.includes('"sequence"');

    // ── Helper: call ai-chat and return parsed JSON content ──────────────
    const callAI = async (message: string, maxTokens: number) => {
      const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message, modelId, history: [], language, maxTokens,
          // Use ai-chat's explicit prompt path, bypass exercise formatting and
          // OpenAI's automatic replacement of math system instructions.
          customPrompt: 'You generate structured lesson JSON for the application. Follow the exact schema and task in the user message. Return one complete JSON object only, without Markdown or a tutoring-chat envelope.',
          isUnified: true,
          requestMode: 'lessonGeneration',
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

    // ── Helper: build lesson content object from AI response ─────────────
    const buildLessonContent = (generatedContent: any, stepName: string, difficultyLevel: number) => {
      if (generatedContent?.version === '2.0' || (isV2Prompt && Array.isArray(generatedContent?.sequence))) {
        // Models occasionally omit identifiers even when the schema is otherwise
        // valid. Normalize only deterministic metadata before validation/storage;
        // pedagogical content is never fabricated here.
        generatedContent.sequence = Array.isArray(generatedContent.sequence)
          ? generatedContent.sequence.map((block: any, index: number) => ({
            ...block,
            id: typeof block?.id === 'string' && block.id.trim() ? block.id : `block-${index + 1}`,
            ...(Array.isArray(block?.hints) ? {} : { hints: [] }),
          }))
          : generatedContent.sequence;
        generatedContent.prerequisites = Array.isArray(generatedContent.prerequisites)
          ? generatedContent.prerequisites.map((item: any, index: number) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
            return { ...item, id: typeof item.id === 'string' && item.id.trim() ? item.id : `prerequisite-${index + 1}` };
          })
          : generatedContent.prerequisites;
        generatedContent.misconceptions = Array.isArray(generatedContent.misconceptions) ? generatedContent.misconceptions : [];
        generatedContent.success_criteria = Array.isArray(generatedContent.success_criteria) && generatedContent.success_criteria.length
          ? generatedContent.success_criteria : ['Je peux expliquer et appliquer cette notion.'];
        generatedContent.lesson_goal = typeof generatedContent.lesson_goal === 'string' && generatedContent.lesson_goal.trim()
          ? generatedContent.lesson_goal : `Comprendre et appliquer ${topic.name}.`;
        generatedContent.mastery = generatedContent.mastery && typeof generatedContent.mastery === 'object'
          ? { ...(generatedContent.mastery as Record<string, unknown>), skills: Array.isArray(generatedContent.mastery.skills) ? generatedContent.mastery.skills : [], threshold: Number(generatedContent.mastery.threshold ?? 0.8) }
          : { skills: [], threshold: 0.8 };
        const validTypes = new Set(['hook','concept','visual','prediction','guided_example','student_try','feedback_checkpoint','contrast','rule','worked_example','reflection','mastery_check']);
        generatedContent.sequence = generatedContent.sequence.map((block: any, index: number) => {
          const type = validTypes.has(block?.type) ? block.type : (index === generatedContent.sequence.length - 1 ? 'mastery_check' : 'concept');
          return { ...block, id: String(block?.id || `block-${index + 1}`), type };
        });
        const valid = Array.isArray(generatedContent.sequence)
          && generatedContent.sequence.length > 0
          && generatedContent.sequence.every((block: any) => block && typeof block.id === 'string' && validTypes.has(block.type))
          && typeof generatedContent.lesson_goal === 'string'
          && Array.isArray(generatedContent.prerequisites)
          && Array.isArray(generatedContent.misconceptions)
          && generatedContent.mastery && typeof generatedContent.mastery.threshold === 'number' && Number.isFinite(generatedContent.mastery.threshold);
        if (!valid) throw new Error('AI returned malformed Lesson Generator V2 JSON');
        return { ...generatedContent, version: '2.0' };
      }
      if (isV2Prompt) throw new Error('AI returned non-V2 lesson content');
      const rawMistakes = generatedContent.common_mistakes || [];
      const normalizedMistakes = rawMistakes.map((m: any) => {
        if (typeof m === 'string') return { mistake: m, why: '' };
        if (typeof m === 'object' && m !== null) return { mistake: m.mistake || m.tip || '', why: m.why || '' };
        return { mistake: String(m), why: '' };
      });
      const quiz = buildQuiz(generatedContent.quiz, difficultyLevel);
      return {
        vocabulary: generatedContent.vocabulary || [],
        explanation: generatedContent.explanation,
        examples: generatedContent.examples || [],
        example: generatedContent.example,
        ...(Array.isArray(generatedContent.example_steps) && generatedContent.example_steps.length > 0
          ? { example_steps: generatedContent.example_steps } : {}),
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
      let generated: any;
      try {
        generated = await callAI(prompt, 2600);
      } catch (firstError) {
        // JSON-only generation can occasionally fail on a long pedagogical
        // contract. Retry once with an explicit repair instruction before
        // surfacing the failure to the batch generator.
        console.warn('[generate-lesson-content] First generation attempt failed; retrying:', firstError);
        try {
          generated = await callAI(`${prompt}\n\nRETRY: return only a complete valid JSON object matching the requested schema. Do not add commentary or Markdown.`, 3600);
        } catch (retryError) {
          if (isV2Prompt) {
            console.warn('[generate-lesson-content] V2 retry JSON failed; using fallback:', retryError);
            generated = null;
          } else throw retryError;
        }
      }
      try {
        return buildLessonContent(generated, stepName, difficultyLevel);
      } catch (contentError) {
        if (!isV2Prompt) throw contentError;
        console.warn('[generate-lesson-content] V2 schema validation failed; retrying:', contentError);
        const repaired = await callAI(`${prompt}\n\nRETRY: the previous response was not a complete V2 lesson. Return a complete valid JSON object with version \"2.0\", lesson_goal, success_criteria, prerequisites, non-empty sequence, misconceptions, and mastery. JSON only.`, 3600);
        try { return buildLessonContent(repaired, stepName, difficultyLevel); }
        catch (finalError) {
          console.error('[generate-lesson-content] V2 validation failed:', finalError);
          throw finalError;
        }
      }
    };

    // V2.1: plan the topic first, then generate one complete V2 lesson per level.
    if (isV2Prompt && !requestStepName) {
      const objectiveText = objectives.map((o) => `${o.id}: ${o.text}`).join('\n- ') || 'Non précisés';
      const planningPrompt = `LESSON GENERATOR V2.1 — PLANIFICATION UNIQUEMENT\nSujet: ${topic.name}\nNiveau: ${rawLevel}\nObjectifs réels (utiliser uniquement ces IDs):\n- ${objectiveText}\nDétermine 1 à 4 niveaux distincts adaptés à la complexité. Retourne uniquement du JSON strict (guillemets doubles, aucune apostrophe de code, aucun Markdown): {"topic_goal":"...","levels":[{"id":"level_1","level_number":1,"title":"...","purpose":"...","difficulty":"foundation|application|transfer","objective_ids":["real-id"],"prerequisites":["..."],"success_criteria":["..."]}]}`;
      let plan: any;
      try {
        plan = await callAI(planningPrompt, 900);
      } catch (planningError) {
        console.warn('[generate-lesson-content] V2.1 planning JSON failed; retrying repair:', planningError);
        try {
          plan = await callAI(`${planningPrompt}\nREPAIR: return one complete valid JSON object only. Do not use single quotes.`, 1200);
        } catch (repairError) {
          console.warn('[generate-lesson-content] V2.1 planning repair failed; using deterministic plan:', repairError);
          const fallbackCount = Math.max(1, Math.min(4, objectives.length || 2));
          const fallbackTitles = ['Comprendre les notions essentielles', 'Appliquer les méthodes', 'Résoudre des problèmes', 'Transférer et maîtriser'];
          plan = { topic_goal: `Maîtriser ${topic.name}.`, levels: Array.from({ length: fallbackCount }, (_, index) => ({ id: `level_${index + 1}`, level_number: index + 1, title: fallbackTitles[index], purpose: `Progresser dans ${topic.name}.`, difficulty: index === 0 ? 'foundation' : index === fallbackCount - 1 ? 'transfer' : 'application', objective_ids: objectives.slice(index === 0 ? 0 : Math.max(0, index - 1), Math.max(1, Math.ceil(objectives.length / fallbackCount) * (index + 1))).map((o) => o.id), prerequisites: [], success_criteria: [`Je peux progresser dans ${topic.name}.`] })) };
        }
      }
      const planned = Array.isArray(plan?.levels) ? plan.levels.slice(0, 4) : [];
      if (planned.length === 0) throw new Error('AI returned no valid V2.1 levels');
      const validIds = new Set(objectives.map((o) => o.id));
      const levels = [];
      for (let i = 0; i < planned.length; i++) {
        const p = planned[i];
        const assigned = Array.isArray(p.objective_ids) ? p.objective_ids.filter((id: unknown) => validIds.has(String(id))).map(String) : [];
        const levelPrompt = `LESSON GENERATOR V2.1 — UNE SEULE LEÇON DE NIVEAU\nSujet: ${topic.name}\nObjectif global: ${plan.topic_goal}\nNiveau ${i + 1}/${planned.length}: ${p.title}\nBut: ${p.purpose}\nDifficulté: ${p.difficulty}\nObjectifs assignés (IDs réels, ne pas modifier): ${assigned.map((id: string) => `${id}: ${objectives.find((o) => o.id === id)?.text ?? id}`).join('; ')}\nPrérequis de niveau: ${(p.prerequisites ?? []).join('; ')}\nCritères: ${(p.success_criteria ?? []).join('; ')}\nRetourne UNIQUEMENT l'objet lesson, sans envelope: {"lesson_goal":"...","success_criteria":["..."],"prerequisites":[{"id":"p1","description":"...","check_question":"...","expected_answer":"...","remediation_hint":"..."}],"sequence":[{"id":"c1","type":"concept","title":"...","content":"..."},{"id":"m1","type":"mastery_check","questions":[{"id":"q1","question":"...","answer_type":"text","correct_answer":"...","skill":"...","difficulty":1,"success_feedback":"...","error_feedback":"..."}]}],"misconceptions":[{"id":"m1","description":"...","detect_if":"...","feedback":"...","remediation_strategy":"..."}],"mastery":{"skills":["..."],"threshold":0.8}}. Chaque concept DOIT avoir content. Chaque mastery_check DOIT avoir questions non vide. Les prérequis et misconceptions DOIVENT être objets, jamais des chaînes. N'utilise pas teacher_actions/student_actions comme substituts. JSON strict uniquement.`;
        let generated: unknown;
        try {
          generated = await callAI(levelPrompt, 3000);
        } catch (generationError) {
          console.warn('[generate-lesson-content] V2.1 level JSON failed; requesting repair:', generationError);
          generated = null;
        }
        let lesson: Record<string, unknown>;
        try { lesson = buildLessonContent(generated, '', i + 1) as Record<string, unknown>; }
        catch (levelError) {
          console.warn('[generate-lesson-content] V2.1 level contract failed; requesting strict repair:', levelError);
          const repaired = await callAI(`${levelPrompt}\n\nPrevious candidate (data to correct): ${JSON.stringify(generated)}\nThe previous response failed the canonical V2.1 lesson contract. Return ONLY the direct lesson object, with no outer lesson/version/envelope wrapper. Include lesson_goal, success_criteria, structured prerequisites and misconceptions, canonical sequence blocks, and a mastery_check with non-empty questions. Do not use teacher_actions or student_actions. JSON only.`, 3200);
          lesson = buildLessonContent(repaired, '', i + 1) as Record<string, unknown>;
        }
        const levelContract = validateLessonV21({
          version: '2.1',
          topic_goal: String(plan.topic_goal || topic.name),
          levels: [{ id: String(p.id || `level_${i + 1}`), level_number: i + 1, title: String(p.title || `Niveau ${i + 1}`), purpose: String(p.purpose || ''), difficulty: String(p.difficulty || 'application'), objective_ids: assigned, lesson }],
        });
        if (!levelContract.success) {
          console.warn('[generate-lesson-content] V2.1 level failed canonical validation; requesting bounded repair:', levelContract.issues);
          const repaired = await callAI(`${levelPrompt}\n\nPrevious candidate (data to correct): ${JSON.stringify(lesson)}\nThe previous lesson failed the canonical V2.1 contract. Return ONLY the direct lesson object as JSON. Fix every listed issue exactly. A mastery_check MUST contain between 1 and 4 questions (maximum 4), and every question must include id, question, answer_type, correct_answer, skill, difficulty, success_feedback, and error_feedback. Do not add an outer wrapper, do not use teacher_actions or student_actions, and do not omit required fields. Errors: ${levelContract.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`, 3200);
          lesson = buildLessonContent(repaired, '', i + 1) as Record<string, unknown>;
          const repairedContract = validateLessonV21({
            version: '2.1',
            topic_goal: String(plan.topic_goal || topic.name),
            levels: [{ id: String(p.id || `level_${i + 1}`), level_number: i + 1, title: String(p.title || `Niveau ${i + 1}`), purpose: String(p.purpose || ''), difficulty: String(p.difficulty || 'application'), objective_ids: assigned, lesson }],
          });
          if (!repairedContract.success) throw new Error(`Generated V2.1 level failed canonical validation: ${repairedContract.issues.map((issue) => issue.path).join(', ')}`);
        }
        levels.push({ id: String(p.id || `level_${i + 1}`), level_number: i + 1, title: String(p.title || `Niveau ${i + 1}`), purpose: String(p.purpose || ''), difficulty: String(p.difficulty || 'application'), objective_ids: assigned, lesson });
      }
      const v21 = { version: '2.1', topic_goal: String(plan.topic_goal || topic.name), levels };
      const contract = validateLessonV21(v21);
      if (!contract.success) {
        console.error('[generate-lesson-content] V2.1 contract validation failed', { topicId, issues: contract.issues });
        throw new Error(`Generated V2.1 lesson failed canonical validation: ${contract.issues.map((issue) => issue.path).join(', ')}`);
      }
      const { error: v21Error } = await supabase.from('topics').update({ lesson_content: v21 }).eq('id', topicId);
      if (v21Error) throw new Error(`Failed to save V2.1 lesson: ${v21Error.message}`);
      return new Response(JSON.stringify({ success: true, lesson_content: v21, topic_id: topicId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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
    if (!requestStepName && !isV2Prompt) {
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
    } else if (isV2Prompt) {
      plannedSteps = [{ name: '', focus: '' }];
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
