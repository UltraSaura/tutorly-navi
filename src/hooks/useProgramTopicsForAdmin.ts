/**
 * Admin flow:
 * 1. Admin selects country, level, subject
 * 2. We load topics from school program (learning_topics + CurriculumBundle)
 * 3. Admin chooses a topic
 * 4. Resource stores a reference to that topic
 * 5. Students see the resource under the matching Subject → Topic
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProgramTopicForAdmin {
  id: string;
  topicKey: string;
  topicLabel: string;
  description: string | null;
  curriculumLocation: string;
}

export function useProgramTopicsForAdmin({
  countryCode,
  levelCode,
  subjectId,
}: {
  countryCode?: string;
  levelCode?: string;
  subjectId?: string;
}) {
  return useQuery({
    queryKey: ['admin-program-topics', countryCode, levelCode, subjectId],
    queryFn: async (): Promise<ProgramTopicForAdmin[]> => {
      let query = supabase
        .from('learning_topics')
        .select('*')
        .eq('is_active', true);

      // Apply curriculum filters if provided
      if (countryCode) {
        query = query.eq('curriculum_country_code', countryCode);
      }
      if (levelCode) {
        query = query.eq('curriculum_level_code', levelCode);
      }
      if (subjectId) {
        query = query.eq('curriculum_subject_id', subjectId);
      }

      const { data, error } = await query.order('name');
      if (error) throw error;

      return (data || []).map(topic => ({
        id: topic.id,
        topicKey: topic.slug,
        topicLabel: topic.name || topic.slug, // Fallback to slug if name is null
        description: topic.description,
        curriculumLocation: [
          topic.curriculum_country_code,
          topic.curriculum_level_code,
          topic.curriculum_subject_id,
        ].filter(Boolean).join(' → ') || 'Unassigned',
      }));
    },
    // Only enable when all three filters are provided
    enabled: !!(countryCode && levelCode && subjectId),
  });
}
