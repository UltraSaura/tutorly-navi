import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge function for student recommendations
 * GET /recommendations?subjectId={id}&excludeTopicId={id}&limit={n}&preferSameSubdomain={id}
 * 
 * Algorithm:
 * 1. Filter topics by student's curriculum (country + level)
 * 2. Calculate mastery metrics per topic
 * 3. Calculate priority_score = 1 - masteryRatio
 * 4. Boost topics in preferred subdomain
 * 5. Sort by priority_score descending
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with user auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const subjectId = url.searchParams.get('subjectId') || undefined;
    const excludeTopicId = url.searchParams.get('excludeTopicId') || undefined;
    const preferSameSubdomain = url.searchParams.get('preferSameSubdomain') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    console.log('[Recommendations] Request:', {
      userId: user.id,
      subjectId,
      excludeTopicId,
      preferSameSubdomain,
      limit,
    });

    // Get student curriculum profile
    const { data: profile } = await supabase
      .from('users')
      .select('curriculum_country_code, curriculum_level_code')
      .eq('id', user.id)
      .single();

    if (!profile?.curriculum_country_code || !profile?.curriculum_level_code) {
      return new Response(
        JSON.stringify({
          recommendations: [],
          student_id: user.id,
          country_code: null,
          level_code: null,
          message: 'No curriculum profile set',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get topics matching curriculum
    let topicsQuery = supabase
      .from('learning_topics')
      .select(`
        id,
        name,
        slug,
        description,
        estimated_duration_minutes,
        curriculum_subject_id,
        curriculum_domain_id,
        curriculum_subdomain_id,
        learning_categories (
          learning_subjects (
            id,
            name,
            color_scheme
          )
        ),
        topic_objectives (
          objective_id
        )
      `)
      .eq('curriculum_country_code', profile.curriculum_country_code)
      .eq('curriculum_level_code', profile.curriculum_level_code)
      .eq('is_active', true);

    if (subjectId) {
      topicsQuery = topicsQuery.eq('curriculum_subject_id', subjectId);
    }

    if (excludeTopicId) {
      topicsQuery = topicsQuery.neq('id', excludeTopicId);
    }

    const { data: topics, error: topicsError } = await topicsQuery;

    if (topicsError) {
      throw topicsError;
    }

    // Filter topics with objectives
    const topicsWithObjectives = (topics || []).filter(
      (t: any) => t.topic_objectives && t.topic_objectives.length > 0
    );

    if (topicsWithObjectives.length === 0) {
      return new Response(
        JSON.stringify({
          recommendations: [],
          student_id: user.id,
          country_code: profile.curriculum_country_code,
          level_code: profile.curriculum_level_code,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get mastery records
    const { data: masteryRecords } = await supabase
      .from('objective_mastery')
      .select('objective_id, topic_id, status')
      .eq('student_id', user.id);

    const masteryMap = new Map();
    (masteryRecords || []).forEach((record: any) => {
      if (!masteryMap.has(record.topic_id)) {
        masteryMap.set(record.topic_id, new Map());
      }
      masteryMap.get(record.topic_id).set(record.objective_id, record.status);
    });

    // Calculate recommendations
    const recommendations = topicsWithObjectives.map((topic: any) => {
      const objectiveIds = topic.topic_objectives.map((to: any) => to.objective_id);
      const totalObjectives = objectiveIds.length;
      
      const topicMastery = masteryMap.get(topic.id) || new Map();
      
      let masteredCount = 0;
      let inProgressCount = 0;
      let notStartedCount = 0;

      objectiveIds.forEach((objId: string) => {
        const status = topicMastery.get(objId);
        if (status === 'mastered') {
          masteredCount++;
        } else if (status === 'in_progress') {
          inProgressCount++;
        } else {
          notStartedCount++;
        }
      });

      const masteryRatio = totalObjectives > 0 ? masteredCount / totalObjectives : 0;
      let priorityScore = 1 - masteryRatio;

      // Boost subdomain preference by 0.5 points
      if (preferSameSubdomain && topic.curriculum_subdomain_id === preferSameSubdomain) {
        priorityScore += 0.5;
      }

      const subject = topic.learning_categories?.learning_subjects;

      return {
        topic_id: topic.id,
        topic_name: topic.name,
        topic_slug: topic.slug,
        topic_description: topic.description,
        subject_id: subject?.id || '',
        subject_name: subject?.name || '',
        subject_color: subject?.color_scheme || '#6366f1',
        domain_id: topic.curriculum_domain_id,
        subdomain_id: topic.curriculum_subdomain_id,
        total_objectives: totalObjectives,
        mastered_objectives: masteredCount,
        in_progress_objectives: inProgressCount,
        not_started_objectives: notStartedCount,
        mastery_ratio: masteryRatio,
        priority_score: priorityScore,
        estimated_duration_minutes: topic.estimated_duration_minutes,
      };
    });

    // Sort by priority_score (descending), then in_progress, then name
    recommendations.sort((a, b) => {
      if (b.priority_score !== a.priority_score) {
        return b.priority_score - a.priority_score;
      }
      if (b.in_progress_objectives !== a.in_progress_objectives) {
        return b.in_progress_objectives - a.in_progress_objectives;
      }
      return a.topic_name.localeCompare(b.topic_name);
    });

    const topRecommendations = recommendations.slice(0, limit);

    console.log('[Recommendations] Returning', topRecommendations.length, 'recommendations');

    return new Response(
      JSON.stringify({
        recommendations: topRecommendations,
        student_id: user.id,
        country_code: profile.curriculum_country_code,
        level_code: profile.curriculum_level_code,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Recommendations] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
