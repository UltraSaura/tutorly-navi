import { describe, expect, it, vi } from 'vitest';
import { fetchProviderResponse, isRetryableProviderFailure, ProviderRequestError, readProviderJson } from './provider-request';

describe('provider request safety', () => {
  it('aborts a slow request and clears its timer', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const request = fetchProviderResponse('https://provider.invalid', {}, { timeoutMs: 1, fetchImpl });
    const assertion = expect(request).rejects.toMatchObject({ kind: 'timeout' });
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it('classifies only transient upstream failures as retryable', async () => {
    const response = new Response('', { status: 503 });
    await expect(fetchProviderResponse('https://provider.invalid', {}, { fetchImpl: vi.fn().mockResolvedValue(response) })).rejects.toMatchObject({ kind: 'upstream' });
    expect(isRetryableProviderFailure(new ProviderRequestError('bad json', 'permanent'))).toBe(false);
    expect(isRetryableProviderFailure(new ProviderRequestError('timeout', 'timeout'))).toBe(true);
  });

  it('preserves retry-after without exposing response content', async () => {
    const response = new Response('sensitive provider body', { status: 429, headers: { 'retry-after': '2' } });
    try {
      await fetchProviderResponse('https://provider.invalid', {}, { fetchImpl: vi.fn().mockResolvedValue(response) });
    } catch (error) {
      expect(error).toMatchObject({ kind: 'rate_limit', status: 429, retryAfterMs: 2000 });
      expect((error as Error).message).not.toContain('sensitive');
    }
  });

  it('bounds response-body parsing separately from the network request', async () => {
    const response = { json: () => new Promise(() => {}) } as Response;
    vi.useFakeTimers();
    const request = readProviderJson(response, { timeoutMs: 1 });
    const assertion = expect(request).rejects.toMatchObject({ kind: 'timeout' });
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    vi.useRealTimers();
  });
});
