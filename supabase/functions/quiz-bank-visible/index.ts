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
    const { topicId, completedVideoIds, userId } = await req.json();

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

    // Fetch active assignments
    let query = supabase
      .from('quiz_bank_assignments')
      .select('*')
      .eq('is_active', true);

    // Filter by topic_id or video_ids
    query = query.or(`topic_id.eq.${topicId},video_ids.not.is.null`);

    const { data: assigns, error } = await query;

    if (error) {
      console.error('Error fetching assignments:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const doneCount = Array.isArray(completedVideoIds) ? completedVideoIds.length : 0;
    const completedIds = Array.isArray(completedVideoIds) ? completedVideoIds : [];

    const visible = (assigns || []).filter((a: any) => {
      // Check topic-based assignment
      if (a.topic_id && a.trigger_after_n_videos != null) {
        return doneCount >= a.trigger_after_n_videos;
      }
      // Check video set-based assignment
      if (Array.isArray(a.video_ids) && a.min_completed_in_set != null) {
        const hits = a.video_ids.filter((id: string) => completedIds.includes(id)).length;
        return hits >= a.min_completed_in_set;
      }
      return false;
    }).map((a: any) => ({ id: a.id, bankId: a.bank_id }));

    return new Response(
      JSON.stringify({ visible }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Quiz bank visible function error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

