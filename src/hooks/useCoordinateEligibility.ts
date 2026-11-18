import { useActiveSchoolLevel } from './useActiveSchoolLevel';
import { useUserCurriculumProfile } from './useUserCurriculumProfile';
import { useLearner } from '@/context/FamilyProfileContext';
import { normalizeSchoolLevel } from '@/domain/schoolLevels';
import { isCoordinateCurriculumAllowed } from '@/features/practice/exerciseCurriculum';

export function useCoordinateEligibility() {
  const active = useActiveSchoolLevel();
  const { profile, isLoading } = useUserCurriculumProfile();
  const { learnerId, loading } = useLearner();
  // Match the existing StudentCurriculum preview convention; language never selects country.
  const country = profile?.countryCode ?? (active.isPreviewing ? 'fr' : null);
  const level = active.normalizedLevel ?? normalizeSchoolLevel(profile?.levelCode);
  const consistent = active.isPreviewing || !active.normalizedLevel || !profile?.levelCode
    || active.normalizedLevel === normalizeSchoolLevel(profile.levelCode);
  const pending = active.isLoading || isLoading || loading;
  return { allowed: !pending && consistent && isCoordinateCurriculumAllowed(country, level), pending,
    country, level, sessionKey: `${learnerId ?? 'guest'}:${country ?? ''}:${level ?? ''}` };
}
