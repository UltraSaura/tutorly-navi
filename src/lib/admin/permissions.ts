export const ADMIN_PERMISSIONS = [
  'content.read',
  'content.write',
  'content.publish',
  'annales.read',
  'annales.write',
  'subjects.read',
  'subjects.write',
  'curriculum.read',
  'curriculum.write',
  'users.manage',
  'roles.manage',
  'ai.manage',
  'prompts.manage',
  'system.manage',
] as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[number];
export type AdministratorRole = 'admin' | 'content_manager' | 'curriculum_manager' | 'super_admin';

const ROLE_PERMISSIONS: Record<Exclude<AdministratorRole, 'admin'>, readonly AdminPermission[]> = {
  content_manager: [
    'content.read', 'content.write', 'content.publish',
    'annales.read', 'annales.write',
    'subjects.read', 'subjects.write',
  ],
  curriculum_manager: ['curriculum.read', 'curriculum.write'],
  super_admin: ADMIN_PERMISSIONS,
};

export function isAdministratorRole(role: string): role is AdministratorRole {
  return role === 'admin' || role === 'content_manager' || role === 'curriculum_manager' || role === 'super_admin';
}

export function permissionsForRoles(roles: readonly string[]): Set<AdminPermission> {
  const permissions = new Set<AdminPermission>();
  // `admin` is intentionally a full-access compatibility role until the
  // explicit administrator reassignment phase is approved and completed.
  if (roles.includes('admin')) return new Set(ADMIN_PERMISSIONS);
  for (const role of roles) {
    if (role === 'super_admin') return new Set(ADMIN_PERMISSIONS);
    for (const permission of ROLE_PERMISSIONS[role as Exclude<AdministratorRole, 'admin'>] ?? []) {
      permissions.add(permission);
    }
  }
  return permissions;
}

export const ADMIN_PERMISSION_BY_PATH: Record<string, AdminPermission> = {
  '/admin/models': 'ai.manage',
  '/admin/diagnostics': 'system.manage',
  '/admin/subjects': 'subjects.read',
  '/admin/users': 'users.manage',
  '/admin/prompts': 'prompts.manage',
  '/admin/learning': 'content.read',
  '/admin/generated-lessons': 'content.read',
  '/admin/staging-lessons': 'content.write',
  '/admin/curriculum': 'curriculum.read',
  '/admin/exams': 'annales.read',
  '/admin/recent-updates': 'system.manage',
  '/admin/settings': 'system.manage',
};

export function firstAuthorizedAdminPath(permissions: ReadonlySet<AdminPermission>): string {
  for (const [path, permission] of Object.entries(ADMIN_PERMISSION_BY_PATH)) {
    if (permissions.has(permission)) return path;
  }
  return '/auth';
}
