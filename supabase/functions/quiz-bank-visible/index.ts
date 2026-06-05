import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeLevel(level?: string | null): string | null {
  if (!level) return null;
  return level
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[:_\s-]+/g, '');
}

function matchesLevel(userLevel: string | null, schoolLevels?: string[] | null): boolean {
  if (!schoolLevels || schoolLevels.length === 0) return true;
  const normalizedUserLevel = normalizeLevel(userLevel);
  if (!normalizedUserLevel) return true;
  return schoolLevels.some((level) => normalizeLevel(level) === normalizedUserLevel);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topicId, completedVideoIds, userId, context = 'both', userLevel = null, language = 'en' } = await req.json();

    if (!topicId) {
      return new Response(
        JSON.stringify({ error: 'Topic ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { data: assigns, error } = await supabase
      .from('quiz_bank_assignments')
      .select('*')
      .eq('is_active', true)
      .eq('topic_id', topicId);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const relevantBankIds = [...new Set((assigns || []).map((assignment: any) => assignment.bank_id).filter(Boolean))];
    const [{ data: banks, error: bankError }, { data: topic }] = await Promise.all([
      relevantBankIds.length > 0
        ? supabase
            .from('quiz_banks')
            .select('id, school_levels')
            .in('id', relevantBankIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('topics')
        .select('curriculum_level_code')
        .eq('id', topicId)
        .maybeSingle(),
    ]);

    if (bankError) {
      return new Response(
        JSON.stringify({ error: bankError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bankMap = new Map((banks || []).map((bank: any) => [bank.id, bank]));
    const fallbackLevel = topic?.curriculum_level_code ?? null;

    const completedIds = Array.isArray(completedVideoIds) ? completedVideoIds : [];
    const doneCount = completedIds.length;

    const visible = (assigns || []).filter((a: any) => {
      const dc = a.display_context ?? 'both';

      // Context filter
      if (context === 'practice' && dc === 'lesson') return false;
      if (context === 'lesson'   && dc === 'practice') return false;

      // Practice context: always visible
      if (dc === 'practice') return true;
      if (context === 'practice') return true;

      // Lesson: trigger_video_id
      if (a.trigger_video_id) return completedIds.includes(a.trigger_video_id);

      // Legacy topic-based
      if (a.trigger_after_n_videos != null) return doneCount >= a.trigger_after_n_videos;

      // Legacy video-set
      if (Array.isArray(a.video_ids) && a.min_completed_in_set != null) {
        const hits = a.video_ids.filter((id: string) => completedIds.includes(id)).length;
        return hits >= a.min_completed_in_set;
      }

      return false;
    }).map((a: any) => {
      const bank = bankMap.get(a.bank_id);
      const effectiveSchoolLevels = Array.isArray(bank?.school_levels) && bank.school_levels.length > 0
        ? bank.school_levels
        : (fallbackLevel ? [fallbackLevel] : []);

      if (!matchesLevel(userLevel, effectiveSchoolLevels)) {
        return null;
      }

      return { id: a.id, bankId: a.bank_id, language };
    }).filter(Boolean);

    return new Response(
      JSON.stringify({ visible }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
