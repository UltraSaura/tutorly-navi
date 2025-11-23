/**
 * CURRICULUM DATA PIPELINE:
 * 
 * 1. User profile → curriculum_country_code + curriculum_level_code
 * 2. CurriculumBundle (JSON) → get subjects/domains/subdomains for that country/level
 * 3. Supabase query → fetch learning_topics that match curriculum filters
 * 4. buildSubjectsFromCurriculum → transform into nested structure
 * 5. Return to UI → subjects with their domains/subdomains/topics
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserCurriculumProfile } from './useUserCurriculumProfile';
import { useLanguage } from '@/context/SimpleLanguageContext';
import {
  getSubjects,
  getDomainsBySubject,
  getSubdomainsByDomain,
} from '@/lib/curriculum';
import { buildSubjectsFromCurriculum } from '@/domain/curriculum';
import type { CurriculumSubject } from '@/domain/curriculum';

interface UseStudentCurriculumResult {
  subjects: CurriculumSubject[];
  isLoading: boolean;
  error: Error | null;
}

export function useStudentCurriculum(): UseStudentCurriculumResult {
  const { profile, isLoading: profileLoading } = useUserCurriculumProfile();
  const { language } = useLanguage();

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['student-curriculum', profile?.countryCode, profile?.levelCode, language],
    queryFn: async (): Promise<CurriculumSubject[]> => {
      if (!profile?.countryCode || !profile?.levelCode) {
        return [];
      }

      // Step 1: Get curriculum structure from bundle
      const curriculumSubjects = getSubjects(profile.countryCode, profile.levelCode);

      if (curriculumSubjects.length === 0) {
        console.warn(
          `No curriculum subjects found for ${profile.countryCode} - ${profile.levelCode}`
        );
        return [];
      }

      // Collect all domains and subdomains for this level
      const curriculumDomains: any[] = [];
      const curriculumSubdomains: any[] = [];

      curriculumSubjects.forEach(subject => {
        const domains = getDomainsBySubject(
          profile.countryCode,
          profile.levelCode,
          subject.id
        );
        curriculumDomains.push(...domains);

        domains.forEach(domain => {
          const subdomains = getSubdomainsByDomain(
            profile.countryCode,
            profile.levelCode,
            subject.id,
            domain.id
          );
          curriculumSubdomains.push(...subdomains);
        });
      });

      // Step 2: Fetch learning subjects with categories from database
      const { data: learningSubjects, error: subjectsError } = await supabase
        .from('learning_subjects')
        .select(
          `
          *,
          learning_categories!inner (
            id,
            name,
            subject_id
          )
        `
        )
        .eq('is_active', true)
        .order('order_index');

      if (subjectsError) throw subjectsError;
      if (!learningSubjects || learningSubjects.length === 0) return [];

      // Transform to match expected type
      const typedSubjects = learningSubjects.map((subject: any) => ({
        ...subject,
        learning_categories: subject.learning_categories || [],
      }));

      // Step 3: Fetch topics filtered by curriculum
      const { data: learningTopics, error: topicsError } = await supabase
        .from('learning_topics')
        .select('*')
        .eq('curriculum_country_code', profile.countryCode)
        .eq('curriculum_level_code', profile.levelCode)
        .eq('is_active', true)
        .order('order_index');

      if (topicsError) throw topicsError;
      if (!learningTopics || learningTopics.length === 0) {
        console.warn(
          `No topics found for curriculum ${profile.countryCode} - ${profile.levelCode}`
        );
        return [];
      }

      // Step 4: Build nested structure
      const subjects = buildSubjectsFromCurriculum({
        learningSubjects: typedSubjects as any,
        learningTopics,
        curriculumSubjects,
        curriculumDomains,
        curriculumSubdomains,
        language,
      });

      return subjects;
    },
    enabled: !!profile?.countryCode && !!profile?.levelCode && !profileLoading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    subjects: data || [],
    isLoading: isLoading || profileLoading,
    error: error as Error | null,
  };
}
