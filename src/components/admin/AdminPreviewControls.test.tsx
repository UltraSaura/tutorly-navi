import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n/useInterfaceTranslation', () => ({
  useInterfaceTranslation: () => (key: string) => key,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en', resolvedLanguage: 'en' } }),
}));
vi.mock('@/hooks/useAdminAuth', () => ({
  useAdminAuth: () => ({ canPreviewSchoolLevels: true }),
}));
vi.mock('@/contexts/AdminPreviewContext', () => ({
  useAdminPreview: () => ({
    isAdminPreviewEnabled: true,
    previewLevel: 'cm2',
    clearPreviewMode: vi.fn(),
  }),
  labelForAdminPreviewLevel: () => 'CM2',
  ADMIN_PREVIEW_LEVELS: [],
}));

import { AdminPreviewBanner } from './AdminPreviewControls';

describe('AdminPreviewBanner', () => {
  it('reads preview permission from useAdminAuth without an undefined variable', () => {
    expect(() => renderToStaticMarkup(<AdminPreviewBanner />)).not.toThrow();
    expect(renderToStaticMarkup(<AdminPreviewBanner />)).toContain('Student preview mode: CM2');
  });
});
