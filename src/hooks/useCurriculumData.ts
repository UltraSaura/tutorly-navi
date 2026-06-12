import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Domain, Subdomain, ObjectiveWithSuccessCriteria } from '@/types/curriculum';

export const useDomains = () => {
  return useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .order('domain');
      
      if (error) throw error;
      return data as Domain[];
    },
  });
};

export const useSubdomains = (domain?: string) => {
  return useQuery({
    queryKey: ['subdomains', domain],
    queryFn: async () => {
      let query = supabase
        .from('subdomains')
        .select('*')
        .order('subdomain');
      
      if (domain) {
        query = query.eq('domain', domain);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Subdomain[];
    },
  });
};

export const useObjectives = (filters?: {
  level?: string;
  subjectId?: string;
  domainId?: string;
  subdomainId?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: ['objectives', filters],
    queryFn: async () => {
      let query = supabase
        .from('objectives')
        .select(`
          *,
          success_criteria (*)
        `)
        .order('id');

      if (filters?.level) {
        query = query.ilike('level', filters.level);
      }
      if (filters?.subjectId) {
        query = query.eq('subject_id_uuid', filters.subjectId);
      }
      if (filters?.domainId) {
        query = query.eq('domain_id_uuid', filters.domainId);
      }
      if (filters?.subdomainId) {
        query = query.eq('subdomain_id_uuid', filters.subdomainId);
      }
      if (filters?.search) {
        query = query.ilike('text', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ObjectiveWithSuccessCriteria[];
    },
  });
};

export const useDbSubjects = (countryCode?: string, level?: string) => {
  return useQuery({
    queryKey: ['db-subjects', countryCode, level],
    queryFn: async () => {
      let subjectsQuery = supabase
        .from('subjects')
        .select('id, name, slug, country_code')
        .eq('is_active', true)
        .order('name');

      if (countryCode) {
        subjectsQuery = subjectsQuery.eq('country_code', countryCode.toLowerCase());
      }

      let objectivesQuery = supabase
        .from('objectives')
        .select('subject_id_uuid');

      if (level) {
        objectivesQuery = objectivesQuery.ilike('level', level);
      }

      const [{ data: subjects, error: subjectsError }, { data: objectives, error: objectivesError }] = await Promise.all([
        subjectsQuery,
        objectivesQuery,
      ]);

      if (subjectsError) throw subjectsError;
      if (objectivesError) throw objectivesError;

      const counts = new Map<string, number>();
      (objectives ?? []).forEach((objective) => {
        if (!objective.subject_id_uuid) return;
        const id = String(objective.subject_id_uuid);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      });

      return (subjects ?? [])
        .map((subject) => ({
          id: subject.id,
          name: subject.name,
          slug: subject.slug,
          objectiveCount: counts.get(subject.id) ?? 0,
        }))
        .filter((subject) => subject.objectiveCount > 0) as { id: string; name: string; slug: string; objectiveCount: number }[];
    },
  });
};

export const useDbDomains = (subjectId?: string, level?: string) => {
  return useQuery({
    queryKey: ['db-domains', subjectId, level],
    queryFn: async () => {
      if (!subjectId) return [];
      let objectivesQuery = supabase
        .from('objectives')
        .select('domain_id_uuid')
        .eq('subject_id_uuid', subjectId);

      if (level) {
        objectivesQuery = objectivesQuery.ilike('level', level);
      }

      const [{ data: domains, error: domainsError }, { data: objectives, error: objectivesError }] = await Promise.all([
        supabase
        .from('domains')
        .select('id, code, label')
        .eq('subject_id', subjectId)
          .order('label'),
        objectivesQuery,
      ]);

      if (domainsError) throw domainsError;
      if (objectivesError) throw objectivesError;

      const counts = new Map<string, number>();
      (objectives ?? []).forEach((objective) => {
        if (!objective.domain_id_uuid) return;
        const id = String(objective.domain_id_uuid);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      });

      return (domains ?? [])
        .map((domain) => ({ ...domain, objectiveCount: counts.get(domain.id) ?? 0 }))
        .filter((domain) => domain.objectiveCount > 0) as { id: string; code: string; label: string; objectiveCount: number }[];
    },
    enabled: !!subjectId,
  });
};

export const useDbSubdomains = (domainId?: string, level?: string) => {
  return useQuery({
    queryKey: ['db-subdomains', domainId, level],
    queryFn: async () => {
      if (!domainId) return [];
      let objectivesQuery = supabase
        .from('objectives')
        .select('subdomain_id_uuid')
        .eq('domain_id_uuid', domainId);

      if (level) {
        objectivesQuery = objectivesQuery.ilike('level', level);
      }

      const [{ data: subdomains, error: subdomainsError }, { data: objectives, error: objectivesError }] = await Promise.all([
        (supabase as any)
          .from('subdomains')
          .select('id_new, code, label')
          .eq('domain_id_new', domainId)
          .order('label'),
        objectivesQuery,
      ]);

      if (subdomainsError) throw subdomainsError;
      if (objectivesError) throw objectivesError;

      const counts = new Map<string, number>();
      (objectives ?? []).forEach((objective) => {
        if (!objective.subdomain_id_uuid) return;
        const id = String(objective.subdomain_id_uuid);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      });

      return (subdomains ?? [])
        .map((subdomain: { id_new: string; code: string; label: string }) => ({
          ...subdomain,
          objectiveCount: counts.get(subdomain.id_new) ?? 0,
        }))
        .filter((subdomain: { objectiveCount: number }) => subdomain.objectiveCount > 0) as { id_new: string; code: string; label: string; objectiveCount: number }[];
    },
    enabled: !!domainId,
  });
};

export const useCurriculumStats = () => {
  return useQuery({
    queryKey: ['curriculum-stats'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      
      // Query each table individually with proper types
      const [
        domainsRes,
        subdomainsRes,
        objectivesRes,
        successCriteriaRes,
        tasksRes,
        unitsRes,
        lessonsRes,
      ] = await Promise.all([
        supabase.from('domains').select('*', { count: 'exact', head: true }),
        supabase.from('subdomains').select('*', { count: 'exact', head: true }),
        supabase.from('objectives').select('*', { count: 'exact', head: true }),
        supabase.from('success_criteria').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('units').select('*', { count: 'exact', head: true }),
        supabase.from('lessons').select('*', { count: 'exact', head: true }),
      ]);
      
      if (domainsRes.error) throw domainsRes.error;
      if (subdomainsRes.error) throw subdomainsRes.error;
      if (objectivesRes.error) throw objectivesRes.error;
      if (successCriteriaRes.error) throw successCriteriaRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (unitsRes.error) throw unitsRes.error;
      if (lessonsRes.error) throw lessonsRes.error;
      
      counts.domains = domainsRes.count || 0;
      counts.subdomains = subdomainsRes.count || 0;
      counts.objectives = objectivesRes.count || 0;
      counts.success_criteria = successCriteriaRes.count || 0;
      counts.tasks = tasksRes.count || 0;
      counts.units = unitsRes.count || 0;
      counts.lessons = lessonsRes.count || 0;
      
      return counts;
    },
  });
};
