import { useMemo, useState } from 'react';
import {
  getCountries,
  getLevelsByCountry,
  getSubjects,
  getDomainsBySubject,
  getSubdomainsByDomain,
} from '@/lib/curriculum';
import type {
  CurriculumCountry,
  CurriculumLevel,
  CurriculumSubject,
  CurriculumDomain,
  CurriculumSubdomain,
} from '@/types/curriculum';

export interface CurriculumSelection {
  countryCode: string;
  levelCode: string;
  subjectId: string;
  domainId: string;
  subdomainId: string;
}

export function useCurriculumSelector(initialSelection?: Partial<CurriculumSelection>) {
  const [selection, setSelection] = useState<Partial<CurriculumSelection>>({
    countryCode: initialSelection?.countryCode || '',
    levelCode: initialSelection?.levelCode || '',
    subjectId: initialSelection?.subjectId || '',
    domainId: initialSelection?.domainId || '',
    subdomainId: initialSelection?.subdomainId || '',
  });

  // Get available options based on current selection
  const countries = useMemo(() => getCountries(), []);
  
  const levels = useMemo(() => {
    return selection.countryCode ? getLevelsByCountry(selection.countryCode) : [];
  }, [selection.countryCode]);

  const subjects = useMemo(() => {
    return (selection.countryCode && selection.levelCode)
      ? getSubjects(selection.countryCode, selection.levelCode)
      : [];
  }, [selection.countryCode, selection.levelCode]);

  const domains = useMemo(() => {
    return (selection.countryCode && selection.levelCode && selection.subjectId)
      ? getDomainsBySubject(selection.countryCode, selection.levelCode, selection.subjectId)
      : [];
  }, [selection.countryCode, selection.levelCode, selection.subjectId]);

  const subdomains = useMemo(() => {
    return (selection.countryCode && selection.levelCode && selection.subjectId && selection.domainId)
      ? getSubdomainsByDomain(
          selection.countryCode,
          selection.levelCode,
          selection.subjectId,
          selection.domainId
        )
      : [];
  }, [selection.countryCode, selection.levelCode, selection.subjectId, selection.domainId]);

  // Update handlers with cascading reset logic
  const setCountry = (countryCode: string) => {
    setSelection({
      countryCode,
      levelCode: '',
      subjectId: '',
      domainId: '',
      subdomainId: '',
    });
  };

  const setLevel = (levelCode: string) => {
    setSelection(prev => ({
      ...prev,
      levelCode,
      subjectId: '',
      domainId: '',
      subdomainId: '',
    }));
  };

  const setSubject = (subjectId: string) => {
    setSelection(prev => ({
      ...prev,
      subjectId,
      domainId: '',
      subdomainId: '',
    }));
  };

  const setDomain = (domainId: string) => {
    setSelection(prev => ({
      ...prev,
      domainId,
      subdomainId: '',
    }));
  };

  const setSubdomain = (subdomainId: string) => {
    setSelection(prev => ({
      ...prev,
      subdomainId,
    }));
  };

  const reset = () => {
    setSelection({
      countryCode: '',
      levelCode: '',
      subjectId: '',
      domainId: '',
      subdomainId: '',
    });
  };

  return {
    selection,
    countries,
    levels,
    subjects,
    domains,
    subdomains,
    setCountry,
    setLevel,
    setSubject,
    setDomain,
    setSubdomain,
    reset,
  };
}
