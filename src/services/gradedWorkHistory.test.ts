import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProblemSubmission } from '@/types/chat';
import {
  buildGradedWorkFromExercise,
  buildGradedWorkFromGroupedProblem,
  saveGradedWorkToHistory,
} from './gradedWorkHistory';

const supabaseMock = vi.hoisted(() => {
  type InsertRecord = { table: string; payload: Record<string, unknown> };
  type UpdateRecord = {
    table: string;
    payload: Record<string, unknown>;
    filters: Record<string, unknown>;
  };

  const state = {
    userId: 'student-1',
    existingHistory: null as null | { id: string; attempts_count: number | null },
    inserts: [] as InsertRecord[],
    updates: [] as UpdateRecord[],
  };

  function tableBuilder(table: string) {
    const filters: Record<string, unknown> = {};
    type Builder = {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      maybeSingle: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      insert: ReturnType<typeof vi.fn>;
      single: ReturnType<typeof vi.fn>;
    };

    const builder = {} as Builder;
    Object.assign(builder, {
      select: vi.fn(() => builder),
      eq: vi.fn((column: string, value: unknown) => {
        filters[column] = value;
        return builder;
      }),
      maybeSingle: vi.fn(async () => ({ data: state.existingHistory, error: null })),
      update: vi.fn((payload: Record<string, unknown>) => {
        state.updates.push({ table, payload, filters });
        return builder;
      }),
      insert: vi.fn((payload: Record<string, unknown>) => {
        state.inserts.push({ table, payload });
        return builder;
      }),
      single: vi.fn(async () => ({ data: { id: state.existingHistory?.id || 'history-new' }, error: null })),
    });
    return builder;
  }

  return {
    state,
    client: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: state.userId } }, error: null })),
      },
      from: vi.fn(tableBuilder),
    },
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock.client,
}));

function groupedProblem(rows: ProblemSubmission['sections'][number]['rows']): ProblemSubmission {
  return {
    id: 'problem-1',
    submissionId: 'submission-1',
    type: 'grouped_problem',
    rawText: 'Mixed homework',
    attachments: [],
    title: 'Mixed homework',
    sharedContext: 'Answer only the selected rows.',
    sections: [{ id: 'section-1', rows }],
    status: 'evaluated',
    createdAt: '2026-05-06T00:00:00.000Z',
    updatedAt: '2026-05-06T00:00:00.000Z',
    keepGrouped: true,
  };
}

describe('graded work history', () => {
  beforeEach(() => {
    supabaseMock.state.existingHistory = null;
    supabaseMock.state.inserts = [];
    supabaseMock.state.updates = [];
    vi.clearAllMocks();
  });

  it('builds one graded work row from a chat exercise', () => {
    const row = buildGradedWorkFromExercise({
      id: 'exercise-1',
      question: '2 + 3',
      userAnswer: '5',
      isCorrect: true,
      subjectId: 'addition',
      expanded: false,
      attemptCount: 1,
      attempts: [],
      lastAttemptDate: new Date(),
      needsRetry: false,
    });

    expect(row).toEqual({
      exerciseContent: '2 + 3',
      userAnswer: '5',
      isCorrect: true,
      subjectId: 'addition',
      topicId: null,
    });
  });

  it('builds grouped work only from selected evaluated rows', () => {
    const rows = buildGradedWorkFromGroupedProblem(groupedProblem([
      {
        id: 'fraction-row',
        label: 'A',
        prompt: '1/2 + 1/3 = ?',
        answerType: 'text',
        options: [],
        selected: false,
        doNotGrade: true,
      },
      {
        id: 'addition-row',
        label: 'B',
        prompt: '2 + 3 = ?',
        answerType: 'text',
        options: [],
        selected: true,
        studentAnswer: '5',
        evaluation: {
          selectedAnswer: '5',
          correctAnswer: '5',
          isCorrect: true,
          justificationProvided: false,
          status: 'correct',
        },
      },
    ]));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userAnswer: '5',
      isCorrect: true,
    });
    expect(rows[0].exerciseContent).toContain('2 + 3 = ?');
    expect(rows[0].exerciseContent).not.toContain('1/2 + 1/3');
  });

  it('inserts new exercise history and attempt rows', async () => {
    const result = await saveGradedWorkToHistory({
      exerciseContent: '2 + 3',
      userAnswer: '5',
      isCorrect: true,
      subjectId: 'addition',
    });

    expect(result).toEqual({ exerciseHistoryId: 'history-new', attemptNumber: 1 });
    expect(supabaseMock.state.inserts).toEqual([
      {
        table: 'exercise_history',
        payload: expect.objectContaining({
          user_id: 'student-1',
          exercise_content: '2 + 3',
          user_answer: '5',
          is_correct: true,
          subject_id: 'addition',
          attempts_count: 1,
        }),
      },
      {
        table: 'exercise_attempts',
        payload: expect.objectContaining({
          exercise_history_id: 'history-new',
          user_answer: '5',
          is_correct: true,
          attempt_number: 1,
        }),
      },
    ]);
  });

  it('updates repeated exercises and appends the next attempt', async () => {
    supabaseMock.state.existingHistory = { id: 'history-existing', attempts_count: 2 };

    const result = await saveGradedWorkToHistory({
      exerciseContent: '2 + 3',
      userAnswer: '4',
      isCorrect: false,
      subjectId: 'addition',
    });

    expect(result).toEqual({ exerciseHistoryId: 'history-existing', attemptNumber: 3 });
    expect(supabaseMock.state.updates).toEqual([
      {
        table: 'exercise_history',
        payload: expect.objectContaining({
          user_answer: '4',
          is_correct: false,
          subject_id: 'addition',
          attempts_count: 3,
        }),
        filters: expect.objectContaining({ id: 'history-existing' }),
      },
    ]);
    expect(supabaseMock.state.inserts).toEqual([
      {
        table: 'exercise_attempts',
        payload: expect.objectContaining({
          exercise_history_id: 'history-existing',
          user_answer: '4',
          is_correct: false,
          attempt_number: 3,
        }),
      },
    ]);
  });
});
