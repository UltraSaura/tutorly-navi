import { describe, expect, it } from 'vitest';
import { firstAuthorizedAdminPath, permissionsForRoles } from './permissions';

describe('administrator permission registry', () => {
  it('keeps legacy admins full-access during migration', () => {
    const permissions = permissionsForRoles(['admin']);
    expect(permissions.has('roles.manage')).toBe(true);
    expect(permissions.has('curriculum.write')).toBe(true);
    expect(firstAuthorizedAdminPath(permissions)).toBe('/admin/models');
  });

  it('limits content managers to content, annales, and subjects', () => {
    const permissions = permissionsForRoles(['content_manager']);
    expect([...permissions].sort()).toEqual([
      'annales.read', 'annales.write', 'content.publish', 'content.read',
      'content.write', 'subjects.read', 'subjects.write',
    ]);
    expect(permissions.has('curriculum.read')).toBe(false);
    expect(permissions.has('roles.manage')).toBe(false);
    expect(firstAuthorizedAdminPath(permissions)).toBe('/admin/subjects');
  });

  it('limits curriculum managers to curriculum', () => {
    const permissions = permissionsForRoles(['curriculum_manager']);
    expect(permissions.has('curriculum.read')).toBe(true);
    expect(permissions.has('curriculum.write')).toBe(true);
    expect(permissions.has('content.read')).toBe(false);
    expect(firstAuthorizedAdminPath(permissions)).toBe('/admin/curriculum');
  });

  it('keeps testers and family roles outside administrator permissions', () => {
    expect(permissionsForRoles(['tester']).size).toBe(0);
    expect(permissionsForRoles(['parent', 'student']).size).toBe(0);
  });
});
