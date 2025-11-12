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
    const { topicId, videoId, completedVideoIds, userId } = await req.json();

    console.log('quiz-bank-all called with:', { topicId, videoId, completedVideoIds, userId });

    if (!topicId && !videoId) {
      return new Response(
        JSON.stringify({ error: 'Topic ID or Video ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Fetch all active assignments
    const { data: assigns, error } = await supabase
      .from('quiz_bank_assignments')
      .select('*')
      .eq('is_active', true);
    
    console.log('All assignments fetched:', assigns?.length);

    if (error) {
      console.error('Error fetching assignments:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const doneCount = Array.isArray(completedVideoIds) ? completedVideoIds.length : 0;
    const completedIds = Array.isArray(completedVideoIds) ? completedVideoIds : [];

    // Filter assignments to only those relevant to this video/topic
    const relevantAssignments = (assigns || []).filter((a: any) => {
      // Include if topic_id matches
      if (a.topic_id === topicId) return true;
      
      // Include if video_ids contains current videoId
      if (videoId && Array.isArray(a.video_ids) && a.video_ids.includes(videoId)) return true;
      
      return false;
    });

    console.log('Relevant assignments:', relevantAssignments.length);

    const allBanks = relevantAssignments.map((a: any) => {
      let isUnlocked = false;
      let progressMessage = '';
      let completedCount = 0;
      let requiredCount = 0;

      // Check topic-based assignment
      if (a.topic_id && a.trigger_after_n_videos != null) {
        requiredCount = a.trigger_after_n_videos;
        completedCount = doneCount;
        isUnlocked = doneCount >= a.trigger_after_n_videos;
        if (!isUnlocked) {
          const remaining = a.trigger_after_n_videos - doneCount;
          progressMessage = `Complete ${remaining} more video${remaining === 1 ? '' : 's'} to unlock`;
        }
      }
      
      // Check video set-based assignment
      if (Array.isArray(a.video_ids) && a.min_completed_in_set != null) {
        requiredCount = a.min_completed_in_set;
        completedCount = a.video_ids.filter((id: string) => completedIds.includes(id)).length;
        isUnlocked = completedCount >= a.min_completed_in_set;
        if (!isUnlocked) {
          const remaining = a.min_completed_in_set - completedCount;
          progressMessage = `Complete ${remaining} more video${remaining === 1 ? '' : 's'} from this set to unlock`;
        }
      }

      return {
        id: a.id,
        bankId: a.bank_id,
        isUnlocked,
        progressMessage,
        completedCount,
        requiredCount,
        videoIds: a.video_ids || [],
        topicId: a.topic_id || null
      };
    });

    return new Response(
      JSON.stringify({ banks: allBanks }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Quiz bank all function error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
