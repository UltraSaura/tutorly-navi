import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  getCountries,
  getLevelsByCountry,
  getSubjects,
  getDomainsBySubject,
  getSubdomainsByDomain,
  getAllSubjectsInCountry,
  subscribeBundle,
  getBundleVersion,
  primeCurriculumBundle,
} from '@/lib/curriculum';
import type {
  CurriculumCountry,
  CurriculumLevel,
  CurriculumSubject,
  CurriculumDomain,
  CurriculumSubdomain,
} from '@/types/curriculum';

/**
 * Subscribe to bundle version so any selector re-renders once the
 * Supabase-backed curriculum tree finishes loading.
 */
function useBundleVersion(): number {
  useEffect(() => { primeCurriculumBundle().catch(() => {}); }, []);
  return useSyncExternalStore(subscribeBundle, getBundleVersion, getBundleVersion);
}

export function useCurriculumCountries(): CurriculumCountry[] {
  const v = useBundleVersion();
  return useMemo(() => getCountries(), [v]);
}

export function useCurriculumLevels(countryId: string): CurriculumLevel[] {
  const v = useBundleVersion();
  return useMemo(() => {
    if (!countryId) return [];
    return getLevelsByCountry(countryId);
  }, [countryId, v]);
}

export function useCurriculumSubjects(
  countryId: string,
  levelId: string
): CurriculumSubject[] {
  const v = useBundleVersion();
  return useMemo(() => {
    if (!countryId || !levelId) return [];
    return getSubjects(countryId, levelId);
  }, [countryId, levelId, v]);
}

export function useAllCurriculumSubjects(countryId: string): CurriculumSubject[] {
  const v = useBundleVersion();
  return useMemo(() => {
    if (!countryId) return [];
    return getAllSubjectsInCountry(countryId);
  }, [countryId, v]);
}

export function useCurriculumDomains(
  countryId: string,
  levelId: string,
  subjectId: string
): CurriculumDomain[] {
  const v = useBundleVersion();
  return useMemo(() => {
    if (!countryId || !levelId || !subjectId) return [];
    return getDomainsBySubject(countryId, levelId, subjectId);
  }, [countryId, levelId, subjectId, v]);
}

export function useCurriculumSubdomains(
  countryId: string,
  levelId: string,
  subjectId: string,
  domainId: string
): CurriculumSubdomain[] {
  const v = useBundleVersion();
  return useMemo(() => {
    if (!countryId || !levelId || !subjectId || !domainId) return [];
    return getSubdomainsByDomain(countryId, levelId, subjectId, domainId);
  }, [countryId, levelId, subjectId, domainId, v]);
}
