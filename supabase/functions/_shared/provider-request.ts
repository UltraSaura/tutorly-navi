export const PROVIDER_CALL_TIMEOUT_MS = 15_000;
export const PROVIDER_TOTAL_BUDGET_MS = 45_000;

export type ProviderFailureKind = 'timeout' | 'network' | 'rate_limit' | 'upstream' | 'authentication' | 'permanent';

export class ProviderRequestError extends Error {
  readonly kind: ProviderFailureKind;
  readonly status?: number;
  readonly retryAfterMs?: number;

  constructor(message: string, kind: ProviderFailureKind, options: { status?: number; retryAfterMs?: number } = {}) {
    super(message);
    this.name = 'ProviderRequestError';
    this.kind = kind;
    this.status = options.status;
    this.retryAfterMs = options.retryAfterMs;
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.min(seconds * 1000, 5_000));
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return undefined;
  return Math.max(0, Math.min(date - Date.now(), 5_000));
}

export function isRetryableProviderFailure(error: unknown): error is ProviderRequestError {
  return error instanceof ProviderRequestError && ['timeout', 'network', 'rate_limit', 'upstream'].includes(error.kind);
}

export async function fetchProviderResponse(
  input: RequestInfo | URL,
  init: RequestInit,
  options: { signal?: AbortSignal; timeoutMs?: number; deadline?: number; fetchImpl?: typeof fetch } = {},
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? PROVIDER_CALL_TIMEOUT_MS;
  const deadline = options.deadline ?? Date.now() + PROVIDER_TOTAL_BUDGET_MS;
  const remaining = Math.min(timeoutMs, deadline - Date.now());
  if (remaining <= 0) throw new ProviderRequestError('Provider time budget exceeded.', 'timeout');

  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), remaining);
  try {
    let response: Response;
    try {
      response = await fetchImpl(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) throw new ProviderRequestError('Provider request timed out or was cancelled.', 'timeout');
      throw new ProviderRequestError('Provider request failed before receiving a response.', 'network');
    }

    if (response.ok) return response;
    const kind: ProviderFailureKind = response.status === 408 || response.status === 425 || response.status === 429
      ? 'rate_limit'
      : response.status === 401 || response.status === 403
        ? 'authentication'
        : response.status >= 500
          ? 'upstream'
          : 'permanent';
    throw new ProviderRequestError(`Provider request failed (HTTP ${response.status}).`, kind, {
      status: response.status,
      retryAfterMs: parseRetryAfter(response.headers.get('retry-after')),
    });
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

export async function readProviderJson<T>(response: Response, options: { deadline?: number; timeoutMs?: number } = {}): Promise<T> {
  const remaining = Math.min(options.timeoutMs ?? PROVIDER_CALL_TIMEOUT_MS, (options.deadline ?? Date.now() + PROVIDER_TOTAL_BUDGET_MS) - Date.now());
  if (remaining <= 0) throw new ProviderRequestError('Provider response time budget exceeded.', 'timeout');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const body = response.json() as Promise<T>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        void response.body?.cancel().catch(() => undefined);
        reject(new ProviderRequestError('Provider response body timed out.', 'timeout'));
      }, remaining);
    });
    return await Promise.race([body, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
