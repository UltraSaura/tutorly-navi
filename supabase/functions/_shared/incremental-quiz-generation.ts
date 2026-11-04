export const QUIZ_BATCH_SIZE = 3;
export const QUIZ_MAX_PROVIDER_CALLS = 8;
export const QUIZ_MAX_RETRIES_PER_BATCH = 1;

export type QuizGenerationFailureCategory =
  | 'timeout'
  | 'network'
  | 'rate_limit'
  | 'upstream'
  | 'authentication'
  | 'permanent'
  | 'validation'
  | 'budget'
  | 'cancelled';

export interface IncrementalQuizProgress<T> {
  requested: number;
  generated: number;
  remaining: number;
  providerCalls: number;
  retryCount: number;
  failedBatch?: number;
  failureCategory?: QuizGenerationFailureCategory;
  questions: T[];
}

export class IncrementalQuizGenerationError<T> extends Error {
  readonly progress: IncrementalQuizProgress<T>;

  constructor(message: string, progress: IncrementalQuizProgress<T>) {
    super(message);
    this.name = 'IncrementalQuizGenerationError';
    this.progress = progress;
  }
}

type RetryableError = { retryAfterMs?: number };

function categoryOf(error: unknown): QuizGenerationFailureCategory {
  const kind = typeof error === 'object' && error !== null && 'kind' in error
    ? String((error as { kind?: unknown }).kind)
    : '';
  if (kind === 'timeout' || kind === 'network' || kind === 'rate_limit' || kind === 'upstream' || kind === 'authentication' || kind === 'permanent') {
    return kind;
  }
  return 'validation';
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Quiz generation failed.';
}

export async function generateQuizIncrementally<T>(options: {
  requested: number;
  deadline: number;
  callBatch: (count: number, existingPrompts: string[], deadline: number) => Promise<unknown[]>;
  validateBatch: (questions: unknown[]) => T[];
  promptOf: (question: T) => string;
  isRetryable: (error: unknown) => boolean;
  signal?: AbortSignal;
  sleep?: (delayMs: number) => Promise<void>;
  batchSize?: number;
  maxProviderCalls?: number;
  maxRetriesPerBatch?: number;
}): Promise<IncrementalQuizProgress<T>> {
  const requested = Math.max(1, options.requested);
  const batchSize = Math.max(1, options.batchSize ?? QUIZ_BATCH_SIZE);
  const maxProviderCalls = Math.max(1, options.maxProviderCalls ?? QUIZ_MAX_PROVIDER_CALLS);
  const maxRetriesPerBatch = Math.max(0, options.maxRetriesPerBatch ?? QUIZ_MAX_RETRIES_PER_BATCH);
  const sleep = options.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  const accepted: T[] = [];
  const seen = new Set<string>();
  let providerCalls = 0;
  let retryCount = 0;
  let failedBatch = 0;

  const progress = (category?: QuizGenerationFailureCategory): IncrementalQuizProgress<T> => ({
    requested,
    generated: accepted.length,
    remaining: Math.max(0, requested - accepted.length),
    providerCalls,
    retryCount,
    failedBatch: failedBatch || undefined,
    failureCategory: category,
    questions: accepted,
  });

  while (accepted.length < requested) {
    const remaining = requested - accepted.length;
    const count = Math.min(batchSize, remaining);
    let batchRetryCount = 0;
    let batchCompleted = false;

    while (!batchCompleted) {
      if (options.signal?.aborted) {
        failedBatch += 1;
        throw new IncrementalQuizGenerationError('Quiz generation was cancelled.', progress('cancelled'));
      }
      if (providerCalls >= maxProviderCalls || Date.now() >= options.deadline) {
        failedBatch += 1;
        throw new IncrementalQuizGenerationError('Quiz generation budget exhausted before completion.', progress('budget'));
      }

      providerCalls += 1;
      try {
        const rawQuestions = await options.callBatch(count, accepted.slice(-12).map(options.promptOf), options.deadline);
        if (options.signal?.aborted) {
          failedBatch += 1;
          throw new IncrementalQuizGenerationError('Quiz generation was cancelled.', progress('cancelled'));
        }
        const validQuestions = options.validateBatch(rawQuestions);
        let addedThisBatch = 0;
        for (const question of validQuestions) {
          const key = options.promptOf(question).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          if (key && !seen.has(key)) {
            seen.add(key);
            accepted.push(question);
            addedThisBatch += 1;
            if (accepted.length >= requested) break;
          }
        }
        if (validQuestions.length === 0 || accepted.length === 0 && validQuestions.length > 0) {
          failedBatch += 1;
          throw new IncrementalQuizGenerationError('The provider returned no valid quiz questions for this batch.', progress('validation'));
        }
        if (accepted.length < requested && addedThisBatch === 0) {
          failedBatch += 1;
          throw new IncrementalQuizGenerationError('The provider returned duplicate quiz questions for this batch.', progress('validation'));
        }
        batchCompleted = true;
      } catch (error) {
        if (error instanceof IncrementalQuizGenerationError) throw error;
        const canRetry = options.isRetryable(error) && batchRetryCount < maxRetriesPerBatch && providerCalls < maxProviderCalls && Date.now() < options.deadline;
        if (!canRetry) {
          failedBatch += 1;
          const category = categoryOf(error);
          throw new IncrementalQuizGenerationError(safeMessage(error), progress(category));
        }
        batchRetryCount += 1;
        retryCount += 1;
        const retryAfterMs = typeof error === 'object' && error !== null && 'retryAfterMs' in error
          ? Number((error as RetryableError).retryAfterMs) || 0
          : 0;
        const delay = Math.min(Math.max(0, retryAfterMs), Math.max(0, options.deadline - Date.now()));
        if (delay > 0) await sleep(delay);
      }
    }
  }

  return progress();
}
