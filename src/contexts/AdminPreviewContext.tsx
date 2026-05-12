import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { SCHOOL_LEVELS, SchoolLevelCode, getSchoolLevelLabel } from '@/domain/schoolLevels';

export const ADMIN_PREVIEW_LEVEL_STORAGE_KEY = 'admin_preview_level';

export const ADMIN_PREVIEW_LEVELS = SCHOOL_LEVELS;

export type AdminPreviewLevel = SchoolLevelCode;

interface AdminPreviewContextValue {
  isAdminPreviewEnabled: boolean;
  previewLevel: AdminPreviewLevel | null;
  setPreviewLevel: (level: AdminPreviewLevel) => void;
  clearPreviewMode: () => void;
}

const AdminPreviewContext = createContext<AdminPreviewContextValue | undefined>(undefined);

function isAdminPreviewLevel(value: string | null): value is AdminPreviewLevel {
  return SCHOOL_LEVELS.some((level) => level.code === value);
}

export function labelForAdminPreviewLevel(level: string | null | undefined, language: string = 'fr'): string {
  return getSchoolLevelLabel(level, language);
}

export function AdminPreviewProvider({ children }: { children: React.ReactNode }) {
  const [previewLevel, setPreviewLevelState] = useState<AdminPreviewLevel | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(ADMIN_PREVIEW_LEVEL_STORAGE_KEY);
    return isAdminPreviewLevel(stored) ? stored : null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (previewLevel) {
      window.localStorage.setItem(ADMIN_PREVIEW_LEVEL_STORAGE_KEY, previewLevel);
    } else {
      window.localStorage.removeItem(ADMIN_PREVIEW_LEVEL_STORAGE_KEY);
    }
  }, [previewLevel]);

  const value = useMemo<AdminPreviewContextValue>(() => ({
    isAdminPreviewEnabled: previewLevel !== null,
    previewLevel,
    setPreviewLevel: setPreviewLevelState,
    clearPreviewMode: () => setPreviewLevelState(null),
  }), [previewLevel]);

  return (
    <AdminPreviewContext.Provider value={value}>
      {children}
    </AdminPreviewContext.Provider>
  );
}

export function useAdminPreview() {
  const context = useContext(AdminPreviewContext);
  if (!context) {
    throw new Error('useAdminPreview must be used within an AdminPreviewProvider');
  }
  return context;
}
