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
        query = query.eq('level', filters.level);
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

export const useDbSubjects = () => {
  return useQuery({
    queryKey: ['db-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, slug')
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string; slug: string }[];
    },
  });
};

export const useDbDomains = (subjectId?: string) => {
  return useQuery({
    queryKey: ['db-domains', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      const { data, error } = await supabase
        .from('domains')
        .select('id, code, label')
        .eq('subject_id', subjectId)
        .order('label');
      if (error) throw error;
      return data as { id: string; code: string; label: string }[];
    },
    enabled: !!subjectId,
  });
};

export const useDbSubdomains = (domainId?: string) => {
  return useQuery({
    queryKey: ['db-subdomains', domainId],
    queryFn: async () => {
      if (!domainId) return [];
      const { data, error } = await (supabase as any)
        .from('subdomains')
        .select('id_new, code, label')
        .eq('domain_id_new', domainId)
        .order('label');
      if (error) throw error;
      return (data ?? []) as { id_new: string; code: string; label: string }[];
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
