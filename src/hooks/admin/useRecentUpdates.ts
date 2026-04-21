import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SinceFilter = '1h' | '24h' | '7d' | '30d' | 'all';

const cutoffFor = (since: SinceFilter): string | null => {
  if (since === 'all') return null;
  const now = Date.now();
  const map: Record<Exclude<SinceFilter, 'all'>, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return new Date(now - map[since]).toISOString();
};

const PAGE_SIZE = 50;
const STALE = 30_000;

interface Args {
  since: SinceFilter;
  search?: string;
}

// Subjects (has updated_at)
export function useRecentSubjects({ since, search }: Args) {
  return useQuery({
    queryKey: ['recent', 'subjects', since, search],
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from('subjects').select('*').order('updated_at', { ascending: false }).limit(PAGE_SIZE);
      const cutoff = cutoffFor(since);
      if (cutoff) q = q.gte('updated_at', cutoff);
      if (search) q = q.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      const subjects = data ?? [];
      if (subjects.length === 0) return subjects;

      // Derive latest level per subject from objectives (ordered by id desc as insertion proxy)
      const ids = subjects.map((s: any) => s.id).filter(Boolean);
      const { data: objRows, error: objErr } = await supabase
        .from('objectives')
        .select('subject_id_uuid, level, created_at')
        .in('subject_id_uuid', ids)
        .order('created_at', { ascending: false });
      if (objErr) throw objErr;

      const latestLevelBySubject = new Map<string, string>();
      (objRows ?? []).forEach((o: any) => {
        if (!o.subject_id_uuid || !o.level) return;
        if (!latestLevelBySubject.has(o.subject_id_uuid)) {
          latestLevelBySubject.set(o.subject_id_uuid, o.level);
        }
      });

      return subjects.map((s: any) => ({
        ...s,
        level: latestLevelBySubject.get(s.id) ?? null,
      }));
    },
  });
}

// Domains (no updated_at — order by id desc as a stable proxy)
export function useRecentDomains({ since, search }: Args) {
  return useQuery({
    queryKey: ['recent', 'domains', since, search],
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from('domains').select('*').limit(PAGE_SIZE);
      if (search) q = q.or(`domain.ilike.%${search}%,label.ilike.%${search}%,code.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecentSubdomains({ since, search }: Args) {
  return useQuery({
    queryKey: ['recent', 'subdomains', since, search],
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from('subdomains').select('*').order('id', { ascending: false }).limit(PAGE_SIZE);
      if (search) q = q.or(`subdomain.ilike.%${search}%,label.ilike.%${search}%,code.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecentObjectives({ since, search }: Args) {
  return useQuery({
    queryKey: ['recent', 'objectives', since, search],
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from('objectives').select('*').limit(PAGE_SIZE);
      if (search) q = q.or(`id.ilike.%${search}%,text.ilike.%${search}%,level.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecentSuccessCriteria({ since, search }: Args) {
  return useQuery({
    queryKey: ['recent', 'success_criteria', since, search],
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from('success_criteria').select('*').limit(PAGE_SIZE);
      if (search) q = q.or(`id.ilike.%${search}%,text.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecentTasks({ since, search }: Args) {
  return useQuery({
    queryKey: ['recent', 'tasks', since, search],
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from('tasks').select('*').limit(PAGE_SIZE);
      if (search) q = q.or(`id.ilike.%${search}%,stem.ilike.%${search}%,type.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecentLessons({ since, search }: Args) {
  return useQuery({
    queryKey: ['recent', 'lessons', since, search],
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from('lessons').select('*').limit(PAGE_SIZE);
      if (search) q = q.or(`id.ilike.%${search}%,title.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecentTopics({ since, search }: Args) {
  return useQuery({
    queryKey: ['recent', 'topics', since, search],
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from('topics').select('*').order('updated_at', { ascending: false }).limit(PAGE_SIZE);
      const cutoff = cutoffFor(since);
      if (cutoff) q = q.gte('updated_at', cutoff);
      if (search) q = q.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Total counts (head: true) per table
export function useTableCounts() {
  return useQuery({
    queryKey: ['recent', 'counts'],
    staleTime: STALE,
    queryFn: async () => {
      const tables = ['subjects', 'domains', 'subdomains', 'objectives', 'success_criteria', 'tasks', 'lessons', 'topics'] as const;
      const results = await Promise.all(
        tables.map(async (t) => {
          const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
          return [t, count ?? 0] as const;
        })
      );
      return Object.fromEntries(results) as Record<typeof tables[number], number>;
    },
  });
}
