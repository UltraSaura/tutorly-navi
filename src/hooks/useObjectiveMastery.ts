import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { 
  TopicMasteryProgress, 
  SubjectMasteryOverview 
} from '@/types/mastery';

/**
 * Fetch mastery records for a specific topic
 */
export function useTopicMastery(topicId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['topic-mastery', topicId, user?.id],
    queryFn: async (): Promise<TopicMasteryProgress | null> => {
      if (!topicId || !user?.id) return null;
      
      // Get topic with linked objectives
      const { data: topic, error: topicError } = await supabase
        .from('learning_topics')
        .select(`
          id,
          name,
          topic_objectives (
            objective_id,
            objectives (
              id,
              text
            )
          )
        `)
        .eq('id', topicId)
        .single();
      
      if (topicError) throw topicError;
      if (!topic) return null;
      
      const objectiveIds = topic.topic_objectives?.map((to: any) => to.objective_id) || [];
      
      if (objectiveIds.length === 0) {
        return {
          topic_id: topic.id,
          topic_name: topic.name,
          objectives: [],
          total_objectives: 0,
          mastered_objectives: 0,
          mastery_percentage: 0,
        };
      }
      
      // Get mastery records for these objectives
      const { data: masteryRecords, error: masteryError } = await supabase
        .from('objective_mastery')
        .select('*')
        .eq('student_id', user.id)
        .eq('topic_id', topicId)
        .in('objective_id', objectiveIds);
      
      if (masteryError) throw masteryError;
      
      const masteryMap = new Map(
        (masteryRecords || []).map((m: any) => [m.objective_id, m])
      );
      
      // Build progress data
      const objectives = topic.topic_objectives.map((to: any) => {
        const obj = to.objectives;
        const mastery = masteryMap.get(to.objective_id);
        
        return {
          objective_id: obj.id,
          objective_text: obj.text,
          status: mastery?.status || 'not_started',
          score_percent: mastery?.score_percent || 0,
        };
      });
      
      const masteredCount = objectives.filter((o: any) => o.status === 'mastered').length;
      
      return {
        topic_id: topic.id,
        topic_name: topic.name,
        objectives,
        total_objectives: objectives.length,
        mastered_objectives: masteredCount,
        mastery_percentage: objectives.length > 0 
          ? Math.round((masteredCount / objectives.length) * 100) 
          : 0,
      };
    },
    enabled: !!topicId && !!user?.id,
  });
}

/**
 * Fetch mastery overview across all subjects for the current student
 * Filtered by student's country and level
 */
export function useStudentMasteryOverview() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['student-mastery-overview', user?.id],
    queryFn: async (): Promise<SubjectMasteryOverview[]> => {
      if (!user?.id) return [];
      
      // Get student's curriculum profile
      const { data: profile } = await supabase
        .from('users')
        .select('curriculum_country_code, curriculum_level_code')
        .eq('id', user.id)
        .single();
      
      if (!profile?.curriculum_country_code || !profile?.curriculum_level_code) {
        return []; // No curriculum set
      }
      
      // Get all topics for this curriculum
      const { data: topics } = await supabase
        .from('learning_topics')
        .select(`
          id,
          curriculum_subject_id,
          category_id,
          topic_objectives (
            objective_id
          )
        `)
        .eq('curriculum_country_code', profile.curriculum_country_code)
        .eq('curriculum_level_code', profile.curriculum_level_code)
        .eq('is_active', true);
      
      if (!topics || topics.length === 0) return [];
      
      // Get unique category IDs to fetch subjects
      const categoryIds = [...new Set(topics.map((t: any) => t.category_id))];
      
      const { data: categories } = await supabase
        .from('learning_categories')
        .select(`
          id,
          subject_id,
          learning_subjects (
            id,
            name,
            color_scheme
          )
        `)
        .in('id', categoryIds);
      
      // Build category to subject map
      const categoryToSubject = new Map();
      categories?.forEach((cat: any) => {
        if (cat.learning_subjects) {
          categoryToSubject.set(cat.id, cat.learning_subjects);
        }
      });
      
      // Group by subject
      const subjectMap = new Map<string, {
        name: string;
        color: string;
        objectiveIds: Set<string>;
      }>();
      
      topics.forEach((topic: any) => {
        const subject = categoryToSubject.get(topic.category_id);
        if (!subject) return;
        
        if (!subjectMap.has(subject.id)) {
          subjectMap.set(subject.id, {
            name: subject.name,
            color: subject.color_scheme,
            objectiveIds: new Set(),
          });
        }
        
        const subjectData = subjectMap.get(subject.id)!;
        topic.topic_objectives?.forEach((to: any) => {
          subjectData.objectiveIds.add(to.objective_id);
        });
      });
      
      // Get mastery data for all objectives
      const { data: masteryRecords } = await supabase
        .from('objective_mastery')
        .select('objective_id, status')
        .eq('student_id', user.id);
      
      const masteryMap = new Map(
        (masteryRecords || []).map((m: any) => [m.objective_id, m.status])
      );
      
      // Build overview
      return Array.from(subjectMap.entries()).map(([subjectId, data]) => {
        const objectiveIds = Array.from(data.objectiveIds);
        const masteredCount = objectiveIds.filter(
          id => masteryMap.get(id) === 'mastered'
        ).length;
        const inProgressCount = objectiveIds.filter(
          id => masteryMap.get(id) === 'in_progress'
        ).length;
        
        return {
          subject_id: subjectId,
          subject_name: data.name,
          subject_color: data.color,
          total_objectives: objectiveIds.length,
          mastered_objectives: masteredCount,
          in_progress_objectives: inProgressCount,
          mastery_percentage: objectiveIds.length > 0
            ? Math.round((masteredCount / objectiveIds.length) * 100)
            : 0,
        };
      }).sort((a, b) => b.mastery_percentage - a.mastery_percentage);
    },
    enabled: !!user?.id,
  });
}

/**
 * Mutation to update mastery from task completion
 */
export function useUpdateObjectiveMastery() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      studentId,
      topicId,
      objectiveId,
      scorePercent,
      countryCode,
      levelCode,
    }: {
      studentId: string;
      topicId: string;
      objectiveId: string;
      scorePercent: number;
      countryCode?: string;
      levelCode?: string;
    }) => {
      const { updateMasteryFromTaskResult } = await import('@/lib/mastery');
      await updateMasteryFromTaskResult({
        studentId,
        topicId,
        objectiveId,
        scorePercent,
        countryCode,
        levelCode,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['topic-mastery', variables.topicId] });
      queryClient.invalidateQueries({ queryKey: ['student-mastery-overview'] });
    },
  });
}
