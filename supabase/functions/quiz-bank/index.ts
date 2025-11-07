import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract bankId from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    // Path format: /functions/v1/quiz-bank/{bankId}
    // So we look for the part after 'quiz-bank'
    const bankIndex = pathParts.indexOf('quiz-bank');
    const bankId = bankIndex >= 0 && bankIndex < pathParts.length - 1 
      ? pathParts[bankIndex + 1] 
      : null;

    // Fallback: try to get from request body if it's a POST
    let finalBankId = bankId;
    if (!finalBankId && req.method === 'POST') {
      try {
        const body = await req.json();
        finalBankId = body.bankId || null;
      } catch {
        // Body might not be JSON
      }
    }

    if (!finalBankId || finalBankId === 'quiz-bank') {
      return new Response(
        JSON.stringify({ error: 'Bank ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Fetch bank
    const { data: bank, error: bErr } = await supabase
      .from('quiz_banks')
      .select('*')
      .eq('id', finalBankId)
      .single();

    if (bErr || !bank) {
      return new Response(
        JSON.stringify({ error: bErr?.message || 'Not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch questions
    const { data: items, error: iErr } = await supabase
      .from('quiz_bank_questions')
      .select('id, payload, position')
      .eq('bank_id', finalBankId)
      .order('position', { ascending: true });

    if (iErr) {
      return new Response(
        JSON.stringify({ error: iErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeBank = {
      quizBankId: bank.id,
      title: bank.title,
      description: bank.description,
      timeLimitSec: bank.time_limit_sec,
      shuffle: bank.shuffle ?? true,
      questions: (items || []).map((it: any) => it.payload)
    };

    return new Response(
      JSON.stringify(safeBank),
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

