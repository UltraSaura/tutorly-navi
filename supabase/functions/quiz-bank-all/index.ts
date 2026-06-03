import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// context: 'practice' | 'lesson' | 'both' (default)
// - 'practice'  → only return assignments where display_context IN ('practice','both')
// - 'lesson'    → only return assignments where display_context IN ('lesson','both')
// - 'both'      → return all (backward compat)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topicId, videoId, completedVideoIds, userId, context = 'both' } = await req.json();

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

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const doneCount = Array.isArray(completedVideoIds) ? completedVideoIds.length : 0;
    const completedIds = Array.isArray(completedVideoIds) ? completedVideoIds : [];

    // Filter by context first
    const contextFiltered = (assigns || []).filter((a: any) => {
      const dc = a.display_context ?? 'both';
      if (context === 'practice') return dc === 'practice' || dc === 'both';
      if (context === 'lesson')   return dc === 'lesson'   || dc === 'both';
      return true; // 'both' context → return everything
    });

    // Then filter by topic/video relevance
    const relevant = contextFiltered.filter((a: any) => {
      if (a.topic_id && a.topic_id === topicId) return true;
      if (videoId && Array.isArray(a.video_ids) && a.video_ids.includes(videoId)) return true;
      // lesson context: trigger_video_id matches
      if (videoId && a.trigger_video_id === videoId) return true;
      return false;
    });

    const allBanks = relevant.map((a: any) => {
      let isUnlocked = false;
      let progressMessage = '';
      let completedCount = 0;
      let requiredCount = 0;
      const dc = a.display_context ?? 'both';

      if (dc === 'practice' || (dc === 'both' && context === 'practice')) {
        // Practice context: always unlocked
        isUnlocked = true;
        progressMessage = '';
      } else if (a.trigger_video_id) {
        // Lesson context: unlocked when that specific video is completed
        isUnlocked = completedIds.includes(a.trigger_video_id);
        requiredCount = 1;
        completedCount = isUnlocked ? 1 : 0;
        if (!isUnlocked) progressMessage = 'Complete this video to unlock';
      } else if (a.topic_id && a.trigger_after_n_videos != null) {
        // Legacy topic-based
        requiredCount = a.trigger_after_n_videos;
        completedCount = doneCount;
        isUnlocked = doneCount >= a.trigger_after_n_videos;
        if (!isUnlocked) {
          const remaining = a.trigger_after_n_videos - doneCount;
          progressMessage = `Complete ${remaining} more video${remaining === 1 ? '' : 's'} to unlock`;
        }
      } else if (Array.isArray(a.video_ids) && a.min_completed_in_set != null) {
        // Legacy video-set-based
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
        topicId: a.topic_id || null,
        triggerVideoId: a.trigger_video_id || null,
        displayContext: dc,
      };
    });

    return new Response(
      JSON.stringify({ banks: allBanks }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
