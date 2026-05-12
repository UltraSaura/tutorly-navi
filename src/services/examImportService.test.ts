import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
  },
}));

function createQuery() {
  const calls: Array<[string, unknown, unknown?]> = [];
  const query: any = {
    select: vi.fn((columns: string) => {
      calls.push(['select', columns]);
      return query;
    }),
    order: vi.fn((column: string, options?: unknown) => {
      calls.push(['order', column, options]);
      return query;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      calls.push(['eq', column, value]);
      return query;
    }),
    in: vi.fn((column: string, value: unknown) => {
      calls.push(['in', column, value]);
      return query;
    }),
    limit: vi.fn((value: number) => {
      calls.push(['limit', value]);
      return query;
    }),
    then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }),
    calls,
  };
  return query;
}

describe('exam import service practice filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters training items by subject, level, and published status', async () => {
    const query = createQuery();
    fromMock.mockReturnValue(query);
    const { fetchTrainingItems } = await import('./examImportService');

    await fetchTrainingItems({ subject_slug: 'mathematiques', level: '3eme', status: 'published' });

    expect(query.calls).toContainEqual(['eq', 'status', 'published']);
    expect(query.calls).toContainEqual(['eq', 'subject_slug', 'mathematiques']);
    expect(query.calls).toContainEqual(['eq', 'level', '3eme']);
  });

  it('filters exam papers by level for annales visibility', async () => {
    const query = createQuery();
    fromMock.mockReturnValue(query);
    const { fetchExamPapers } = await import('./examImportService');

    await fetchExamPapers({ exam: 'dnb', discipline: ['mathematiques', 'physique_chimie'], level: '4eme' });

    expect(query.calls).toContainEqual(['eq', 'exam', 'dnb']);
    expect(query.calls).toContainEqual(['in', 'discipline', ['mathematiques', 'physique_chimie']]);
    expect(query.calls).toContainEqual(['eq', 'level', '4eme']);
  });

  it('filters training item subject counts by level', async () => {
    const query = createQuery();
    fromMock.mockReturnValue(query);
    const { fetchTrainingItemSubjectCounts } = await import('./examImportService');

    await fetchTrainingItemSubjectCounts('3eme');

    expect(query.calls).toContainEqual(['eq', 'status', 'published']);
    expect(query.calls).toContainEqual(['eq', 'level', '3eme']);
  });

  it('queries DNB with 3eme level when practice is previewing 3eme', async () => {
    const query = createQuery();
    fromMock.mockReturnValue(query);
    const { fetchExamPapers, fetchTrainingItems } = await import('./examImportService');

    await fetchExamPapers({ exam: 'dnb', discipline: ['mathematiques'], level: '3eme' });
    await fetchTrainingItems({ subject_slug: 'mathematiques', level: '3eme', status: 'published' });

    expect(query.calls).toContainEqual(['eq', 'exam', 'dnb']);
    expect(query.calls).toContainEqual(['eq', 'level', '3eme']);
    expect(query.calls).toContainEqual(['eq', 'subject_slug', 'mathematiques']);
  });

  it('queries DNB with 4eme level so DNB rows are excluded by the database filter', async () => {
    const query = createQuery();
    fromMock.mockReturnValue(query);
    const { fetchExamPapers, fetchTrainingItems } = await import('./examImportService');

    await fetchExamPapers({ exam: 'dnb', discipline: ['mathematiques'], level: '4eme' });
    await fetchTrainingItems({ subject_slug: 'mathematiques', level: '4eme', status: 'published' });

    expect(query.calls).toContainEqual(['eq', 'exam', 'dnb']);
    expect(query.calls).toContainEqual(['eq', 'level', '4eme']);
    expect(query.calls).toContainEqual(['eq', 'subject_slug', 'mathematiques']);
  });
});
