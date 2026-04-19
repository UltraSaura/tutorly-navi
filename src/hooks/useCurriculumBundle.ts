import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getCountries,
  getLevelsByCountry,
  getSubjects,
  getDomainsBySubject,
  getSubdomainsByDomain,
  getAllSubjectsInCountry,
  loadCurriculumTree,
} from '@/lib/curriculum';
import type {
  CurriculumCountry,
  CurriculumLevel,
  CurriculumSubject,
  CurriculumDomain,
  CurriculumSubdomain,
} from '@/types/curriculum';

const TREE_QUERY_KEY = ['curriculum-tree'] as const;

/**
 * Hydrates the in-memory curriculum cache from Supabase. All other hooks call
 * this to ensure the sync getters return fresh data.
 */
export function useCurriculumTree() {
  return useQuery({
    queryKey: TREE_QUERY_KEY,
    queryFn: () => loadCurriculumTree(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to get all countries from the curriculum
 */
export function useCurriculumCountries(): CurriculumCountry[] {
  const { data } = useCurriculumTree();
  // Recompute whenever the tree resolves so React re-renders with cached data.
  return useMemo(() => getCountries(), [data]);
}

/**
 * Hook to get levels for a specific country
 */
export function useCurriculumLevels(countryId: string): CurriculumLevel[] {
  const { data } = useCurriculumTree();
  return useMemo(() => {
    if (!countryId) return [];
    return getLevelsByCountry(countryId);
  }, [countryId, data]);
}

/**
 * Hook to get subjects for a specific country and level
 */
export function useCurriculumSubjects(
  countryId: string,
  levelId: string
): CurriculumSubject[] {
  const { data } = useCurriculumTree();
  return useMemo(() => {
    if (!countryId || !levelId) return [];
    return getSubjects(countryId, levelId);
  }, [countryId, levelId, data]);
}

/**
 * Hook to get all unique subjects in a country (across all levels)
 */
export function useAllCurriculumSubjects(countryId: string): CurriculumSubject[] {
  const { data } = useCurriculumTree();
  return useMemo(() => {
    if (!countryId) return [];
    return getAllSubjectsInCountry(countryId);
  }, [countryId, data]);
}

/**
 * Hook to get domains for a specific subject
 */
export function useCurriculumDomains(
  countryId: string,
  levelId: string,
  subjectId: string
): CurriculumDomain[] {
  const { data } = useCurriculumTree();
  return useMemo(() => {
    if (!countryId || !levelId || !subjectId) return [];
    return getDomainsBySubject(countryId, levelId, subjectId);
  }, [countryId, levelId, subjectId, data]);
}

/**
 * Hook to get subdomains for a specific domain
 */
export function useCurriculumSubdomains(
  countryId: string,
  levelId: string,
  subjectId: string,
  domainId: string
): CurriculumSubdomain[] {
  const { data } = useCurriculumTree();
  return useMemo(() => {
    if (!countryId || !levelId || !subjectId || !domainId) return [];
    return getSubdomainsByDomain(countryId, levelId, subjectId, domainId);
  }, [countryId, levelId, subjectId, domainId, data]);
}
