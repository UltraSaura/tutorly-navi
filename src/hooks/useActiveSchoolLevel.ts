import { useMemo } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useUserSchoolLevel } from '@/hooks/useUserSchoolLevel';
import { getUserAgeFromLevel } from '@/utils/schoolLevelFilter';
import { normalizeSchoolLevel } from '@/domain/schoolLevels';
import { useAdminPreview } from '@/contexts/AdminPreviewContext';

export type ActiveSchoolLevelSource = 'admin_preview' | 'student_profile' | 'default';

export interface ActiveSchoolLevel {
  activeLevel: string | null;
  normalizedLevel: string | null;
  age: number | null;
  source: ActiveSchoolLevelSource;
  isPreviewing: boolean;
  isLoading: boolean;
}

export function resolveActiveSchoolLevel({
  isAdmin,
  previewLevel,
  profileLevel,
}: {
  isAdmin: boolean;
  previewLevel: string | null | undefined;
  profileLevel: string | null | undefined;
}): Pick<ActiveSchoolLevel, 'activeLevel' | 'source' | 'isPreviewing'> {
  if (isAdmin && previewLevel) {
    return { activeLevel: previewLevel, source: 'admin_preview', isPreviewing: true };
  }
  if (profileLevel) {
    return { activeLevel: profileLevel, source: 'student_profile', isPreviewing: false };
  }
  return { activeLevel: null, source: 'default', isPreviewing: false };
}

export function useActiveSchoolLevel(): ActiveSchoolLevel {
  const { isAdmin, isLoading: adminLoading } = useAdminAuth();
  const { previewLevel } = useAdminPreview();
  const userLevelQuery = useUserSchoolLevel();

  return useMemo(() => {
    const resolved = resolveActiveSchoolLevel({
      isAdmin,
      previewLevel,
      profileLevel: userLevelQuery.data?.level,
    });
    const age = resolved.activeLevel ? getUserAgeFromLevel(resolved.activeLevel) : null;

    return {
      ...resolved,
      normalizedLevel: normalizeSchoolLevel(resolved.activeLevel),
      age,
      isLoading: adminLoading || userLevelQuery.isLoading,
    };
  }, [adminLoading, isAdmin, previewLevel, userLevelQuery.data?.level, userLevelQuery.isLoading]);
}
