import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const privilegedFunctions = [
  'class-students',
  'teacher-classes',
  'generate-lesson-content',
  'generate-quiz-from-topics',
  'generate-quiz-from-transcripts',
  'generate-topics-from-objectives',
  'import-exam-bundle',
  'import-training-items',
  'import-curriculum-bundle',
  'ingest-curriculum-edition',
  'manage-api-keys',
  'subject-icon-upload',
  'suggest-topic-objectives',
] as const;

describe('privileged family Edge Function contract', () => {
  for (const name of privilegedFunctions) {
    it(`${name} checks family mode before existing authorization and work`, () => {
      // generate-lesson-content keeps its request handler in handler.ts so it can be tested directly.
      const file = existsSync(resolve('supabase/functions', name, 'handler.ts')) ? 'handler.ts' : 'index.ts';
      const source = readFileSync(resolve('supabase/functions', name, file), 'utf8');
      const handlerStart = Math.max(source.indexOf('Deno.serve('), source.indexOf('serve(async'), source.indexOf('export async function handleRequest('));
      const adminGuard = source.includes('requireAdminPermissionOrTeacher')
        ? 'await requireAdminPermissionOrTeacher(req'
        : source.includes('requireAdminPermission')
          ? 'await requireAdminPermission(req'
          : 'await requirePrivilegedFamily(req)';
      const guardPosition = source.indexOf(adminGuard, handlerStart);
      const protectedWork = [
        source.indexOf('req.headers.get', handlerStart),
        source.indexOf('await req.json()', handlerStart),
        source.indexOf('Deno.env.get', handlerStart),
      ].filter((position) => position >= 0).sort((left, right) => left - right)[0] ?? -1;

      if (adminGuard === 'await requireAdminPermissionOrTeacher(req') {
        expect(source).toContain("import { requireAdminPermissionOrTeacher } from '../_shared/admin-access.ts'");
      } else if (adminGuard === 'await requireAdminPermission(req') {
        expect(source).toContain("import { requireAdminPermission } from '../_shared/admin-access.ts'");
      } else {
        expect(source).toContain("import { requirePrivilegedFamily } from '../_shared/family-access.ts'");
      }
      expect(source).toContain('x-family-grant');
      expect(handlerStart).toBeGreaterThanOrEqual(0);
      expect(guardPosition).toBeGreaterThan(handlerStart);
      expect(protectedWork).toBeGreaterThan(guardPosition);
    });
  }
});
