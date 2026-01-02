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

    const url = new URL(req.url);
    const studentId = url.searchParams.get('studentId') || user.id;
    const subjectId = url.searchParams.get('subjectId') || undefined;

    // Authorization check
    if (studentId !== user.id) {
      const { data: guardianLink } = await supabase
        .from('guardian_child_links')
        .select('id')
        .eq('guardian_id', user.id)
        .eq('child_id', studentId)
        .maybeSingle();

      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let teacherLink = null;
      if (teacherData) {
        const { data: classLink } = await supabase
          .from('class_student_links')
          .select('id, classes!inner(teacher_id)')
          .eq('student_id', studentId)
          .eq('classes.teacher_id', teacherData.id)
          .maybeSingle();
        teacherLink = classLink;
      }

      if (!guardianLink && !teacherLink) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const progress = await getStudentCurriculumProgress(supabase, studentId, { subjectId });

    return new Response(
      JSON.stringify(progress),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[student-progress] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getStudentCurriculumProgress(supabase: any, studentId: string, options?: { subjectId?: string }) {
  const { data: student, error: studentError } = await supabase
    .from('users')
    .select('first_name, last_name, curriculum_country_code, curriculum_level_code')
    .eq('id', studentId)
    .single();
  
  if (studentError || !student?.curriculum_country_code || !student?.curriculum_level_code) {
    return null;
  }

  let topicsQuery = supabase
    .from('learning_topics')
    .select(`
      id,
      curriculum_subject_id,
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
    .eq('curriculum_country_code', student.curriculum_country_code)
    .eq('curriculum_level_code', student.curriculum_level_code)
    .eq('is_active', true);

  if (options?.subjectId) {
    topicsQuery = topicsQuery.eq('curriculum_subject_id', options.subjectId);
  }

  const { data: topics } = await topicsQuery;

  if (!topics || topics.length === 0) {
    return {
      student_id: studentId,
      student_name: `${student.first_name} ${student.last_name}`,
      country_code: student.curriculum_country_code,
      level_code: student.curriculum_level_code,
      subjects: [],
      overall_mastery_ratio: 0,
    };
  }

  const subjectObjectivesMap = new Map();

  topics.forEach((topic: any) => {
    const subject = topic.learning_categories?.learning_subjects;
    if (!subject) return;

    if (!subjectObjectivesMap.has(subject.id)) {
      subjectObjectivesMap.set(subject.id, {
        subject_id: subject.id,
        subject_name: subject.name,
        subject_color: subject.color_scheme,
        objective_ids: new Set(),
      });
    }

    const subjectData = subjectObjectivesMap.get(subject.id);
    topic.topic_objectives?.forEach((to: any) => {
      subjectData.objective_ids.add(to.objective_id);
    });
  });

  const allObjectiveIds = Array.from(
    new Set(
      Array.from(subjectObjectivesMap.values())
        .flatMap((s: any) => Array.from(s.objective_ids))
    )
  );

  const { data: masteryRecords } = await supabase
    .from('objective_mastery')
    .select('objective_id, status')
    .eq('student_id', studentId)
    .in('objective_id', allObjectiveIds);

  const masteryMap = new Map(
    (masteryRecords || []).map((m: any) => [m.objective_id, m.status])
  );

  const subjects = Array.from(subjectObjectivesMap.values()).map((subjectData: any) => {
    const objectiveIds = Array.from(subjectData.objective_ids) as string[];
    const totalObjectives = objectiveIds.length;
    
    const masteredCount = objectiveIds.filter(
      (id) => masteryMap.get(id) === 'mastered'
    ).length;
    
    const inProgressCount = objectiveIds.filter(
      (id) => masteryMap.get(id) === 'in_progress'
    ).length;

    return {
      subject_id: subjectData.subject_id,
      subject_name: subjectData.subject_name,
      subject_color: subjectData.subject_color,
      total_objectives: totalObjectives,
      mastered_objectives: masteredCount,
      in_progress_objectives: inProgressCount,
      mastery_ratio: totalObjectives > 0 ? masteredCount / totalObjectives : 0,
    };
  });

  const totalObjectivesAll = subjects.reduce((sum: number, s: any) => sum + s.total_objectives, 0);
  const masteredObjectivesAll = subjects.reduce((sum: number, s: any) => sum + s.mastered_objectives, 0);
  const overallMasteryRatio = totalObjectivesAll > 0 ? masteredObjectivesAll / totalObjectivesAll : 0;

  return {
    student_id: studentId,
    student_name: `${student.first_name} ${student.last_name}`,
    country_code: student.curriculum_country_code,
    level_code: student.curriculum_level_code,
    subjects,
    overall_mastery_ratio: overallMasteryRatio,
  };
}
