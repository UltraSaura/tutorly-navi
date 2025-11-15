import { useMemo } from 'react';
import {
  getCountries,
  getLevelsByCountry,
  getSubjects,
  getDomainsBySubject,
  getSubdomainsByDomain,
  getAllSubjectsInCountry,
} from '@/lib/curriculum';
import type {
  CurriculumCountry,
  CurriculumLevel,
  CurriculumSubject,
  CurriculumDomain,
  CurriculumSubdomain,
} from '@/types/curriculum';

/**
 * Hook to get all countries from the curriculum
 */
export function useCurriculumCountries(): CurriculumCountry[] {
  return useMemo(() => getCountries(), []);
}

/**
 * Hook to get levels for a specific country
 */
export function useCurriculumLevels(countryId: string): CurriculumLevel[] {
  return useMemo(() => {
    if (!countryId) return [];
    return getLevelsByCountry(countryId);
  }, [countryId]);
}

/**
 * Hook to get subjects for a specific country and level
 */
export function useCurriculumSubjects(
  countryId: string,
  levelId: string
): CurriculumSubject[] {
  return useMemo(() => {
    if (!countryId || !levelId) return [];
    return getSubjects(countryId, levelId);
  }, [countryId, levelId]);
}

/**
 * Hook to get all unique subjects in a country (across all levels)
 */
export function useAllCurriculumSubjects(countryId: string): CurriculumSubject[] {
  return useMemo(() => {
    if (!countryId) return [];
    return getAllSubjectsInCountry(countryId);
  }, [countryId]);
}

/**
 * Hook to get domains for a specific subject
 */
export function useCurriculumDomains(
  countryId: string,
  levelId: string,
  subjectId: string
): CurriculumDomain[] {
  return useMemo(() => {
    if (!countryId || !levelId || !subjectId) return [];
    return getDomainsBySubject(countryId, levelId, subjectId);
  }, [countryId, levelId, subjectId]);
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
  return useMemo(() => {
    if (!countryId || !levelId || !subjectId || !domainId) return [];
    return getSubdomainsByDomain(countryId, levelId, subjectId, domainId);
  }, [countryId, levelId, subjectId, domainId]);
}
