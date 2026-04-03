import { supabase } from '@/integrations/supabase/client';
import type { StudentCurriculumProgress, SubjectProgress, SubdomainWeakness } from '@/types/progress';

/**
 * Get comprehensive curriculum progress for a student
 * 
 * Used by:
 * - Student dashboard
 * - Parent (guardian) child view
 * - Teacher student view
 * 
 * Logic:
 * 1. Get student's curriculum (country, level)
 * 2. Get all topics for that curriculum
 * 3. Get all objectives linked to those topics
 * 4. Get mastery records for the student
 * 5. Aggregate by subject
 * 
 * @param studentId - User ID of the student
 * @param options - Optional filters (subjectId)
 */
export async function getStudentCurriculumProgress(
  studentId: string,
  options?: { subjectId?: string }
): Promise<StudentCurriculumProgress | null> {
  // Step 1: Get student profile
  const { data: student, error: studentError } = await supabase
    .from('users')
    .select('first_name, last_name, curriculum_country_code, curriculum_level_code')
    .eq('id', studentId)
    .single();
  
  if (studentError || !student?.curriculum_country_code || !student?.curriculum_level_code) {
    console.error('[progressService] Student not found or no curriculum:', studentError);
    return null;
  }

  // Step 2: Get all topics for this curriculum
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

  // Step 3: Group objectives by subject
  const subjectObjectivesMap = new Map<string, {
    subject_id: string;
    subject_name: string;
    subject_color: string;
    objective_ids: Set<string>;
  }>();

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

    const subjectData = subjectObjectivesMap.get(subject.id)!;
    topic.topic_objectives?.forEach((to: any) => {
      subjectData.objective_ids.add(to.objective_id);
    });
  });

  // Step 4: Get mastery records for this student
  const allObjectiveIds = Array.from(
    new Set(
      Array.from(subjectObjectivesMap.values())
        .flatMap(s => Array.from(s.objective_ids))
    )
  );

  const { data: masteryRecords } = await supabase
    .from('objective_mastery')
    .select('objective_id, status')
    .eq('student_id', studentId)
    .in('objective_id', allObjectiveIds);

  const masteryMap = new Map(
    (masteryRecords || []).map(m => [m.objective_id, m.status])
  );

  // Step 5: Calculate per-subject progress
  const subjects: SubjectProgress[] = Array.from(subjectObjectivesMap.values()).map(subjectData => {
    const objectiveIds = Array.from(subjectData.objective_ids);
    const totalObjectives = objectiveIds.length;
    
    const masteredCount = objectiveIds.filter(
      id => masteryMap.get(id) === 'mastered'
    ).length;
    
    const inProgressCount = objectiveIds.filter(
      id => masteryMap.get(id) === 'in_progress'
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

  // Step 6: Calculate overall mastery
  const totalObjectivesAll = subjects.reduce((sum, s) => sum + s.total_objectives, 0);
  const masteredObjectivesAll = subjects.reduce((sum, s) => sum + s.mastered_objectives, 0);
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

/**
 * Get weakest subdomains for a student
 * Helps teachers/parents identify areas needing attention
 */
export async function getWeakestSubdomains(
  studentId: string,
  limit: number = 5
): Promise<SubdomainWeakness[]> {
  // Get student curriculum
  const { data: student } = await supabase
    .from('users')
    .select('curriculum_country_code, curriculum_level_code')
    .eq('id', studentId)
    .single();

  if (!student?.curriculum_country_code || !student?.curriculum_level_code) {
    return [];
  }

  // Get topics grouped by subdomain
  const { data: topics } = await supabase
    .from('learning_topics')
    .select(`
      curriculum_subdomain_id,
      curriculum_subject_id,
      learning_categories (
        learning_subjects (
          id,
          name
        )
      ),
      topic_objectives (
        objective_id
      )
    `)
    .eq('curriculum_country_code', student.curriculum_country_code)
    .eq('curriculum_level_code', student.curriculum_level_code)
    .not('curriculum_subdomain_id', 'is', null)
    .eq('is_active', true);

  if (!topics || topics.length === 0) return [];

  // Group by subdomain
  const subdomainMap = new Map<string, {
    subdomain_id: string;
    subject_id: string;
    subject_name: string;
    objective_ids: Set<string>;
  }>();

  topics.forEach((topic: any) => {
    const subdomainId = topic.curriculum_subdomain_id;
    const subject = topic.learning_categories?.learning_subjects;
    
    if (!subdomainId || !subject) return;

    if (!subdomainMap.has(subdomainId)) {
      subdomainMap.set(subdomainId, {
        subdomain_id: subdomainId,
        subject_id: subject.id,
        subject_name: subject.name,
        objective_ids: new Set(),
      });
    }

    topic.topic_objectives?.forEach((to: any) => {
      subdomainMap.get(subdomainId)!.objective_ids.add(to.objective_id);
    });
  });

  // Get mastery for all objectives
  const allObjectiveIds = Array.from(
    new Set(
      Array.from(subdomainMap.values())
        .flatMap(s => Array.from(s.objective_ids))
    )
  );

  const { data: masteryRecords } = await supabase
    .from('objective_mastery')
    .select('objective_id, status')
    .eq('student_id', studentId)
    .in('objective_id', allObjectiveIds);

  const masteryMap = new Map(
    (masteryRecords || []).map(m => [m.objective_id, m.status])
  );

  // Calculate mastery per subdomain
  const weaknesses: SubdomainWeakness[] = Array.from(subdomainMap.entries()).map(([subdomainId, data]) => {
    const objectiveIds = Array.from(data.objective_ids);
    const totalObjectives = objectiveIds.length;
    const masteredCount = objectiveIds.filter(id => masteryMap.get(id) === 'mastered').length;

    return {
      subdomain_id: subdomainId,
      subdomain_name: subdomainId, // Will be resolved in UI
      subject_id: data.subject_id,
      subject_name: data.subject_name,
      total_objectives: totalObjectives,
      mastered_objectives: masteredCount,
      mastery_ratio: totalObjectives > 0 ? masteredCount / totalObjectives : 0,
    };
  });

  // Sort by mastery ratio (ascending = weakest first)
  weaknesses.sort((a, b) => a.mastery_ratio - b.mastery_ratio);

  return weaknesses.slice(0, limit);
}
