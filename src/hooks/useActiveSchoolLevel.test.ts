import { describe, expect, it } from 'vitest';
import { resolveActiveSchoolLevel } from './useActiveSchoolLevel';

describe('resolveActiveSchoolLevel', () => {
  it('uses admin preview level when an admin selected one', () => {
    expect(resolveActiveSchoolLevel({ isAdmin: true, previewLevel: '3eme', profileLevel: 'cm2' })).toEqual({
      activeLevel: '3eme',
      source: 'admin_preview',
      isPreviewing: true,
    });
  });

  it('falls back to the real profile when admin preview is empty', () => {
    expect(resolveActiveSchoolLevel({ isAdmin: true, previewLevel: null, profileLevel: 'cm2' })).toEqual({
      activeLevel: 'cm2',
      source: 'student_profile',
      isPreviewing: false,
    });
  });

  it('ignores local preview values for non-admin users', () => {
    expect(resolveActiveSchoolLevel({ isAdmin: false, previewLevel: '3eme', profileLevel: '4eme' })).toEqual({
      activeLevel: '4eme',
      source: 'student_profile',
      isPreviewing: false,
    });
  });
});
