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
  return schoolLevels.some((level) => {
    const normalizedLevel = normalizeLevel(level);
    return normalizedLevel === normalizedUserLevel;
  });
}

// context: 'practice' | 'lesson' | 'both' (default)
// - 'practice'  → only return assignments where display_context IN ('practice','both')
// - 'lesson'    → only return assignments where display_context IN ('lesson','both')
// - 'both'      → return all (backward compat)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topicId, videoId, completedVideoIds, userId, context = 'both', userLevel = null, language = 'en' } = await req.json();

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

    const relevantBankIds = [...new Set(relevant.map((assignment: any) => assignment.bank_id).filter(Boolean))];
    const topicIds = [...new Set(relevant.map((assignment: any) => assignment.topic_id).filter(Boolean))];

    const [{ data: banks, error: bankError }, { data: topics, error: topicsError }] = await Promise.all([
      relevantBankIds.length > 0
        ? supabase
            .from('quiz_banks')
            .select('id, school_levels, source_language, primary_topic_id, source_topic_ids')
            .in('id', relevantBankIds)
        : Promise.resolve({ data: [], error: null }),
      topicIds.length > 0
        ? supabase
            .from('topics')
            .select('id, curriculum_level_code')
            .in('id', topicIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (bankError) {
      return new Response(
        JSON.stringify({ error: bankError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (topicsError) {
      return new Response(
        JSON.stringify({ error: topicsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bankMap = new Map((banks || []).map((bank: any) => [bank.id, bank]));
    const topicLevelMap = new Map((topics || []).map((topic: any) => [topic.id, topic.curriculum_level_code]));

    const allBanks = relevant.map((a: any) => {
      const bank = bankMap.get(a.bank_id);
      const fallbackLevel = a.topic_id ? topicLevelMap.get(a.topic_id) : null;
      const effectiveSchoolLevels = Array.isArray(bank?.school_levels) && bank.school_levels.length > 0
        ? bank.school_levels
        : (fallbackLevel ? [fallbackLevel] : []);

      if (!matchesLevel(userLevel, effectiveSchoolLevels)) {
        return null;
      }

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
        language: typeof language === 'string' && language.trim() ? language : (bank?.source_language || 'en'),
      };
    }).filter(Boolean);

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
