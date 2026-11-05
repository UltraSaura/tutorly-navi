import { familyClient, requireParent } from './family-access.ts';

export type AdminPermission =
  | 'content.read' | 'content.write' | 'content.publish'
  | 'annales.read' | 'annales.write'
  | 'subjects.read' | 'subjects.write'
  | 'curriculum.read' | 'curriculum.write'
  | 'users.manage' | 'roles.manage' | 'ai.manage' | 'prompts.manage' | 'system.manage';

export async function requireAdminPermission(req: Request, permission: AdminPermission) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (token && token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) return { serviceRole: true as const };

  const access = await familyClient(req);
  if (access.isFamily) await requireParent(req);

  const { data: allowed, error } = await access.client.rpc('has_admin_permission', {
    _user_id: access.user.id,
    _capability: permission,
  });
  if (error || !allowed) throw new Error(`Forbidden: ${permission} permission required`);
  return { ...access, serviceRole: false as const };
}

export async function requireAdminPermissionOrTeacher(req: Request, permission: AdminPermission) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (token && token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) return { serviceRole: true as const };

  const access = await familyClient(req);
  if (access.isFamily) await requireParent(req);
  const [{ data: allowed }, { data: teacherRole }] = await Promise.all([
    access.client.rpc('has_admin_permission', { _user_id: access.user.id, _capability: permission }),
    access.client.from('user_roles').select('role').eq('user_id', access.user.id).eq('role', 'teacher').maybeSingle(),
  ]);
  if (!allowed && !teacherRole) throw new Error(`Forbidden: ${permission} permission required`);
  return { ...access, serviceRole: false as const };
}
