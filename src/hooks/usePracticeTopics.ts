import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PracticeTopic = {
  id: string;
  topicLabel: string;
  orderIndex: number;
};

export type PracticeDomainGroup = {
  domainId: string;
  domainLabel: string;
  topics: PracticeTopic[];
};

type TopicRow = {
  id: string;
  name: string;
  order_index: number;
  curriculum_domain_id: string | null;
};

export function usePracticeTopics(
  subjectSlug: string,
  levelCode: string,
  countryCode = 'fr',
) {
  const query = useQuery({
    queryKey: ['practice-topics', subjectSlug, levelCode, countryCode],
    queryFn: async (): Promise<PracticeDomainGroup[]> => {
      const { data: categoryRows, error: categoryError } = await supabase
        .from('learning_categories')
        .select('id, learning_subjects:subjects!inner(slug)')
        .eq('learning_subjects.slug', subjectSlug);

      if (categoryError) throw categoryError;

      const categoryIds = (categoryRows || []).map((row) => row.id);
      if (categoryIds.length === 0) return [];

      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id, name, order_index, curriculum_domain_id')
        .eq('curriculum_level_code', levelCode)
        .eq('curriculum_country_code', countryCode)
        .eq('is_active', true)
        .in('category_id', categoryIds)
        .order('order_index', { ascending: true });

      if (topicsError) throw topicsError;

      const topicRows: TopicRow[] = topics || [];
      if (topicRows.length === 0) return [];

      const uniqueDomainIds = Array.from(
        new Set(
          topicRows
            .map((topic) => topic.curriculum_domain_id)
            .filter((domainId): domainId is string => Boolean(domainId)),
        ),
      );

      const domainLabelMap = new Map<string, string>();
      if (uniqueDomainIds.length > 0) {
        const { data: domains, error: domainsError } = await supabase
          .from('domains')
          .select('id, label')
          .in('id', uniqueDomainIds);

        if (domainsError) throw domainsError;

        (domains || []).forEach((domain) => {
          domainLabelMap.set(domain.id, domain.label || domain.id);
        });
      }

      const groupedTopics = new Map<string, PracticeTopic[]>();

      topicRows.forEach((topic) => {
        const domainId = topic.curriculum_domain_id || 'unassigned';
        if (!groupedTopics.has(domainId)) groupedTopics.set(domainId, []);
        groupedTopics.get(domainId)!.push({
          id: topic.id,
          topicLabel: topic.name,
          orderIndex: topic.order_index,
        });
      });

      return Array.from(groupedTopics.entries())
        .map(([domainId, grouped]) => ({
          domainId,
          domainLabel: domainLabelMap.get(domainId) || domainId,
          topics: [...grouped].sort((a, b) => a.orderIndex - b.orderIndex),
        }))
        .sort((a, b) => a.domainLabel.localeCompare(b.domainLabel));
    },
    enabled: Boolean(subjectSlug && levelCode && countryCode),
  });

  return {
    domainGroups: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
