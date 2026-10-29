import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { groupPublishedLessonTopics, type LessonThemeGroup } from '@/features/practice/lessonThemes';

type TopicRow = {
  id: string;
  slug: string;
  name: string;
  order_index: number;
  lesson_content: unknown | null;
  curriculum_domain_id: string | null;
};

type DomainRow = { id: string; label: string | null };

export function usePracticeTopics(subjectSlug: string, levelCode: string, countryCode = 'fr') {
  const query = useQuery({
    queryKey: ['practice-topics', subjectSlug, levelCode, countryCode],
    queryFn: async (): Promise<LessonThemeGroup[]> => {
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('id')
        .eq('slug', subjectSlug)
        .maybeSingle();
      if (subjectError) throw subjectError;
      if (!subjectData) return [];

      const { data: topicRows, error: topicsError } = await supabase
        .from('topics')
        .select('id, slug, name, order_index, lesson_content, curriculum_domain_id')
        .ilike('curriculum_level_code', levelCode)
        .eq('curriculum_subject_id', subjectData.id)
        .ilike('curriculum_country_code', countryCode)
        .or('is_active.eq.true,is_active.is.null')
        .not('lesson_content', 'is', null)
        .order('order_index', { ascending: true });
      if (topicsError) throw topicsError;

      const rows = (topicRows ?? []) as TopicRow[];
      const domainIds = [...new Set(rows.map((row) => row.curriculum_domain_id).filter(Boolean))] as string[];
      const domainLabelMap = new Map<string, string>();
      if (domainIds.length > 0) {
        const { data: domains, error: domainsError } = await supabase.from('domains').select('id, label').in('id', domainIds);
        if (domainsError) throw domainsError;
        for (const domain of (domains ?? []) as DomainRow[]) domainLabelMap.set(domain.id, domain.label || '');
      }

      return groupPublishedLessonTopics(rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        topicLabel: row.name,
        orderIndex: row.order_index,
        lessonContent: row.lesson_content,
        domainLabel: row.curriculum_domain_id ? domainLabelMap.get(row.curriculum_domain_id) : '',
      })));
    },
    enabled: Boolean(subjectSlug && levelCode && countryCode),
  });

  return { themeGroups: query.data || [], isLoading: query.isLoading, error: query.error };
}
