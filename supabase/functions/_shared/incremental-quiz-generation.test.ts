import { describe, expect, it } from 'vitest';
import { generateQuizIncrementally } from './incremental-quiz-generation';

const q = (prompt: string) => ({ prompt });
const run = (responses: Array<unknown[] | Error>, requested = 10) => {
  let index = 0;
  return generateQuizIncrementally({
    requested,
    deadline: Date.now() + 60_000,
    callBatch: async () => {
      const response = responses[index++];
      if (response instanceof Error) throw response;
      return response;
    },
    validateBatch: (questions) => questions as ReturnType<typeof q>[],
    promptOf: (question) => question.prompt,
    isRetryable: (error) => error instanceof Error && error.message === 'transient',
    sleep: async () => undefined,
  });
};

describe('incremental quiz generation', () => {
  it('generates ten questions in batches of three', async () => {
    const result = await run([['a', 'b', 'c'].map(q), ['d', 'e', 'f'].map(q), ['g', 'h', 'i'].map(q), ['j'].map(q)]);
    expect(result.questions).toHaveLength(10);
    expect(result.providerCalls).toBe(4);
    expect(result.retryCount).toBe(0);
  });

  it('supports twenty questions within the explicit eight-call budget', async () => {
    const responses = Array.from({ length: 6 }, (_, i) => [q(String.fromCharCode(97 + i * 3)), q(String.fromCharCode(98 + i * 3)), q(String.fromCharCode(99 + i * 3))]);
    responses.push([q('s'), q('t')]);
    const result = await run(responses, 20);
    expect(result.questions).toHaveLength(20);
    expect(result.providerCalls).toBe(7);
  });

  it('passes the small batch size instead of requesting the full remainder', async () => {
    const batchSizes: number[] = [];
    let index = 0;
    const result = await generateQuizIncrementally({
      requested: 10,
      deadline: Date.now() + 60_000,
      callBatch: async (count) => {
        batchSizes.push(count);
        const values = [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i'], ['j']][index++];
        return values.map(q);
      },
      validateBatch: (questions) => questions as ReturnType<typeof q>[],
      promptOf: (question) => question.prompt,
      isRetryable: () => false,
    });
    expect(result.questions).toHaveLength(10);
    expect(batchSizes).toEqual([3, 3, 3, 1]);
  });

  it('preserves completed batches and retries only the failed batch', async () => {
    const result = await run([['a', 'b', 'c'].map(q), new Error('transient'), ['d', 'e', 'f'].map(q), ['g'].map(q)], 7);
    expect(result.questions.map((question) => question.prompt)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(result.providerCalls).toBe(4);
    expect(result.retryCount).toBe(1);
  });

  it('rejects malformed/non-retryable batches without retrying them', async () => {
    await expect(run([new Error('invalid json')], 3)).rejects.toMatchObject({ progress: { providerCalls: 1, retryCount: 0, failureCategory: 'validation' } });
  });

  it('deduplicates repeated questions and never reports incomplete success', async () => {
    await expect(run([['a', 'a', 'a'].map(q), ['a', 'a', 'a'].map(q)], 4)).rejects.toMatchObject({ progress: { generated: 1, failureCategory: 'validation' } });
  });

  it('stops at the deadline without saving a partial result', async () => {
    await expect(generateQuizIncrementally({
      requested: 3,
      deadline: Date.now() - 1,
      callBatch: async () => [q('never')],
      validateBatch: (questions) => questions as ReturnType<typeof q>[],
      promptOf: (question) => question.prompt,
      isRetryable: () => true,
    })).rejects.toMatchObject({ progress: { providerCalls: 0, generated: 0, failureCategory: 'budget' } });
  });

  it('does not start another batch after cancellation', async () => {
    const controller = new AbortController();
    let calls = 0;
    await expect(generateQuizIncrementally({
      requested: 6,
      deadline: Date.now() + 60_000,
      signal: controller.signal,
      callBatch: async () => {
        calls += 1;
        controller.abort();
        return [q('first')];
      },
      validateBatch: (questions) => questions as ReturnType<typeof q>[],
      promptOf: (question) => question.prompt,
      isRetryable: () => false,
    })).rejects.toMatchObject({ progress: { providerCalls: 1, failureCategory: 'cancelled', generated: 0 } });
    expect(calls).toBe(1);
  });
});
