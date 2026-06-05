import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function stripCodeFence(content: string): string {
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
  else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
  return jsonStr.trim();
}

function languageName(language: string): string {
  switch ((language || '').toLowerCase()) {
    case 'fr':
      return 'French';
    case 'en':
      return 'English';
    default:
      return language || 'English';
  }
}

function mergeTranslatedQuestion(base: any, translated: any) {
  const merged: any = {
    ...base,
    prompt: typeof translated?.prompt === 'string' ? translated.prompt : base.prompt,
    hint: typeof translated?.hint === 'string' ? translated.hint : base.hint,
  };

  if (base.kind === 'single' || base.kind === 'multi') {
    const translatedChoices = new Map((translated?.choices || []).map((choice: any) => [choice.id, choice]));
    merged.choices = (base.choices || []).map((choice: any) => ({
      ...choice,
      label: typeof translatedChoices.get(choice.id)?.label === 'string'
        ? translatedChoices.get(choice.id).label
        : choice.label,
    }));
  }

  if (base.kind === 'ordering') {
    if (Array.isArray(translated?.items) && translated.items.length === base.items.length) {
      merged.items = translated.items;
    }
    if (Array.isArray(translated?.correctOrder) && translated.correctOrder.length === base.correctOrder.length) {
      merged.correctOrder = translated.correctOrder;
    }
  }

  if (base.kind === 'match') {
    const translatedPairs = new Map((translated?.pairs || []).map((pair: any) => [pair.leftId, pair]));
    merged.pairs = (base.pairs || []).map((pair: any) => {
      const translatedPair = translatedPairs.get(pair.leftId);
      return {
        ...pair,
        left: typeof translatedPair?.left === 'string' ? translatedPair.left : pair.left,
        right: typeof translatedPair?.right === 'string' ? translatedPair.right : pair.right,
      };
    });
  }

  if (base.kind === 'fill-expr') {
    if (typeof translated?.template === 'string') merged.template = translated.template;
    if (Array.isArray(translated?.chips) && translated.chips.length === base.chips.length) {
      merged.chips = translated.chips;
    }
    if (translated?.answers && typeof translated.answers === 'object') {
      const sameKeys = Object.keys(base.answers || {}).every((key) => key in translated.answers);
      if (sameKeys) merged.answers = translated.answers;
    }
  }

  if (base.kind === 'slider') {
    if (typeof translated?.trackLabel === 'string') merged.trackLabel = translated.trackLabel;
    if (typeof translated?.unit === 'string') merged.unit = translated.unit;
  }

  return merged;
}

async function translateBankVariant({
  title,
  description,
  questions,
  language,
  apiKey,
}: {
  title: string;
  description: string | null;
  questions: any[];
  language: string;
  apiKey: string;
}) {
  const payload = {
    title,
    description,
    questions,
  };

  const prompt = `Translate the quiz bank JSON below into ${languageName(language)}.

Rules:
- Preserve the JSON structure.
- Keep every id, kind, correct flag, number, visual object, and non-textual field unchanged.
- Translate only student-facing text such as title, description, prompt, hint, labels, instructions, chips, pair text, and explanations.
- Return JSON only with this shape:
{
  "title": "...",
  "description": "...",
  "questions": [...]
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You translate quiz JSON. Return valid JSON only." },
        { role: "user", content: `${prompt}\n\n${JSON.stringify(payload)}` },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to translate quiz bank: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No translation content returned');

  const parsed = JSON.parse(stripCodeFence(content));
  const translatedQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];

  return {
    title: typeof parsed.title === 'string' ? parsed.title : title,
    description: typeof parsed.description === 'string' ? parsed.description : description,
    questions: questions.map((question, index) => mergeTranslatedQuestion(question, translatedQuestions[index])),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let bankId: string | null = null;
    let requestedLanguage = 'en';

    if (req.method === 'POST') {
      const body = await req.json();
      bankId = body.bankId || null;
      requestedLanguage = body.language || 'en';
    } else {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const bankIndex = pathParts.indexOf('quiz-bank');
      bankId = bankIndex >= 0 && bankIndex < pathParts.length - 1 ? pathParts[bankIndex + 1] : null;
      requestedLanguage = url.searchParams.get('language') || 'en';
    }

    if (!bankId || bankId === 'quiz-bank') {
      return new Response(
        JSON.stringify({ error: 'Bank ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: bank, error: bankError } = await supabase
      .from('quiz_banks')
      .select('*')
      .eq('id', bankId)
      .single();

    if (bankError || !bank) {
      return new Response(
        JSON.stringify({ error: bankError?.message || 'Not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from('quiz_bank_questions')
      .select('payload, position')
      .eq('bank_id', bankId)
      .order('position', { ascending: true });

    if (itemsError) {
      return new Response(
        JSON.stringify({ error: itemsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sourceLanguage = bank.source_language || 'en';
    const baseQuestions = (items || []).map((item: any) => item.payload);
    let resolvedTitle = bank.title;
    let resolvedDescription = bank.description;
    let resolvedQuestions = baseQuestions;
    let effectiveLanguage = requestedLanguage || sourceLanguage;

    if (effectiveLanguage !== sourceLanguage) {
      const { data: variant } = await supabase
        .from('quiz_bank_variants')
        .select('title, description, questions')
        .eq('bank_id', bankId)
        .eq('language', effectiveLanguage)
        .maybeSingle();

      if (variant) {
        resolvedTitle = variant.title;
        resolvedDescription = variant.description;
        resolvedQuestions = Array.isArray(variant.questions) ? variant.questions : baseQuestions;
      } else {
        const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
        if (lovableApiKey) {
          const translated = await translateBankVariant({
            title: bank.title,
            description: bank.description,
            questions: baseQuestions,
            language: effectiveLanguage,
            apiKey: lovableApiKey,
          });

          resolvedTitle = translated.title;
          resolvedDescription = translated.description;
          resolvedQuestions = translated.questions;

          await supabase.from('quiz_bank_variants').upsert({
            bank_id: bankId,
            language: effectiveLanguage,
            title: resolvedTitle,
            description: resolvedDescription,
            questions: resolvedQuestions,
          }, {
            onConflict: 'bank_id,language',
          });
        } else {
          effectiveLanguage = sourceLanguage;
        }
      }
    }

    return new Response(
      JSON.stringify({
        quizBankId: bank.id,
        title: resolvedTitle,
        description: resolvedDescription,
        timeLimitSec: bank.time_limit_sec,
        shuffle: bank.shuffle ?? true,
        questions: resolvedQuestions,
        language: effectiveLanguage,
        sourceLanguage,
        schoolLevels: bank.school_levels || [],
        subjectId: bank.subject_id || null,
        primaryTopicId: bank.primary_topic_id || null,
        sourceTopicIds: bank.source_topic_ids || [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Quiz bank function error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
