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
      // Query topics directly by subject slug - bypasses the subjects/categories
      // join chain which fails for curriculum subjects stored as fallback cards.
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id, name, order_index, curriculum_domain_id')
        .eq('curriculum_level_code', levelCode)
        .eq('curriculum_subject_id', subjectSlug)
        .or(`curriculum_country_code.eq.${countryCode},curriculum_country_code.is.null`)
        .or('is_active.eq.true,is_active.is.null')
        .order('order_index', { ascending: true });

      if (topicsError) throw topicsError;

      const topicRows: TopicRow[] = topics || [];

      if (topicRows.length === 0) {
        console.warn(
          '[usePracticeTopics] no topics found for subject:', subjectSlug,
          'level:', levelCode,
        );
        return [];
      }

      // Build domain groups from results.
      const uniqueDomainIds = Array.from(
        new Set(
          topicRows
            .map((t) => t.curriculum_domain_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      const domainLabelMap = new Map<string, string>();
      if (uniqueDomainIds.length > 0) {
        const { data: domains, error: domainsError } = await supabase
          .from('domains')
          .select('id, label')
          .in('id', uniqueDomainIds);

        if (domainsError) throw domainsError;

        (domains || []).forEach((d) => domainLabelMap.set(d.id, d.label || d.id));
      }

      const groupedTopics = new Map<
        string,
        {
          domainId: string;
          domainLabel: string;
          topics: PracticeTopic[];
        }
      >();

      topicRows.forEach((topic) => {
        const domainId = topic.curriculum_domain_id || 'unassigned';
        const domainLabel = domainLabelMap.get(domainId) || domainId;

        if (!groupedTopics.has(domainLabel)) {
          groupedTopics.set(domainLabel, {
            domainId,
            domainLabel,
            topics: [],
          });
        }

        groupedTopics.get(domainLabel)!.topics.push({
          id: topic.id,
          topicLabel: topic.name,
          orderIndex: topic.order_index,
        });
      });

      return Array.from(groupedTopics.values())
        .map((g) => ({
          domainId: g.domainId,
          domainLabel: g.domainLabel,
          topics: [...g.topics].sort((a, b) => a.orderIndex - b.orderIndex),
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
