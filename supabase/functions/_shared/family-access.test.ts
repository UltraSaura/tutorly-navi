import { readFileSync } from 'node:fs';
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
      const source = readFileSync(resolve('supabase/functions', name, 'index.ts'), 'utf8');
      const handlerStart = Math.max(source.indexOf('Deno.serve('), source.indexOf('serve(async'));
      const guard = source.indexOf('await requirePrivilegedFamily(req)', handlerStart);
      const protectedWork = [
        source.indexOf('req.headers.get', handlerStart),
        source.indexOf('await req.json()', handlerStart),
        source.indexOf('Deno.env.get', handlerStart),
      ].filter((position) => position >= 0).sort((left, right) => left - right)[0] ?? -1;

      expect(source).toContain("import { requirePrivilegedFamily } from '../_shared/family-access.ts'");
      expect(source).toContain('x-family-grant');
      expect(handlerStart).toBeGreaterThanOrEqual(0);
      expect(guard).toBeGreaterThan(handlerStart);
      expect(protectedWork).toBeGreaterThan(guard);
    });
  }
});
