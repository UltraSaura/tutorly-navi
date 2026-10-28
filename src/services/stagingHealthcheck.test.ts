import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

import { runStagingHealthcheck } from './stagingHealthcheck';

describe('staging healthcheck', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses healthcheck mode and returns safe observability metadata without provider or database writes', async () => {
    const headers = new Headers({ 'x-request-id': 'req-health-1' });
    invoke.mockResolvedValue({
      data: { ok: true, requestId: 'req-health-1', build: 'staging-build', promptVersion: 'staging-v21', providerCalls: 0, databaseWrite: false },
      error: null,
      response: new Response(null, { status: 200, headers }),
    });
    const result = await runStagingHealthcheck();
    expect(invoke).toHaveBeenCalledWith('generate-lesson-content', { body: { mode: 'healthcheck' } });
    expect(result).toEqual({
      httpStatus: 200,
      requestId: 'req-health-1',
      headerRequestId: 'req-health-1',
      requestIdMatches: true,
      build: 'staging-build',
      promptVersion: 'staging-v21',
      providerCalls: 0,
      databaseWrite: false,
      errorCode: null,
      errorMessage: null,
    });
    expect(JSON.stringify(result)).not.toContain('token');
  });
});
