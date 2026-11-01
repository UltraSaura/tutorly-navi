import { describe, expect, it } from 'vitest';
import { deriveBulkLessonStatus } from './bulkLessonStatus';

describe('bulk lesson status', () => {
  it('reports a staging draft for draft or validated versions', () => {
    expect(deriveBulkLessonStatus({ lessonContent: null, stagingStatuses: ['draft'] })).toBe('staging');
    expect(deriveBulkLessonStatus({ lessonContent: null, stagingStatuses: ['validated'] })).toBe('staging');
  });

  it('reports a published lesson when lesson_content is non-null without staging', () => {
    expect(deriveBulkLessonStatus({ lessonContent: { version: '2.0' }, stagingStatuses: [] })).toBe('published');
  });

  it('reports no version when neither source exists', () => {
    expect(deriveBulkLessonStatus({ lessonContent: null, stagingStatuses: [] })).toBe('none');
  });

  it('prioritizes an allowed staging version when both sources exist', () => {
    expect(deriveBulkLessonStatus({ lessonContent: { version: '2.0' }, stagingStatuses: ['draft'] })).toBe('staging');
  });
});
