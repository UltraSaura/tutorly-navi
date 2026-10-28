import { supabase } from '@/integrations/supabase/client';

export type StagingHealthcheckResult = {
  httpStatus: number | null;
  requestId: string | null;
  headerRequestId: string | null;
  requestIdMatches: boolean | null;
  build: string | null;
  promptVersion: string | null;
  providerCalls: number | null;
  databaseWrite: boolean | null;
  errorCode: string | null;
  errorMessage: string | null;
};

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export async function runStagingHealthcheck(): Promise<StagingHealthcheckResult> {
  const { data, error, response } = await supabase.functions.invoke('generate-lesson-content', {
    body: { mode: 'healthcheck' },
  });
  const body = record(data);
  const errorBody = record(body?.error) ?? record(error);
  const requestId = typeof body?.requestId === 'string' ? body.requestId : typeof errorBody?.requestId === 'string' ? errorBody.requestId : null;
  const headerRequestId = response?.headers?.get('x-request-id') ?? null;
  return {
    httpStatus: typeof response?.status === 'number' ? response.status : null,
    requestId,
    headerRequestId,
    requestIdMatches: requestId && headerRequestId ? requestId === headerRequestId : null,
    build: typeof body?.build === 'string' ? body.build : null,
    promptVersion: typeof body?.promptVersion === 'string' ? body.promptVersion : null,
    providerCalls: typeof body?.providerCalls === 'number' ? body.providerCalls : null,
    databaseWrite: typeof body?.databaseWrite === 'boolean' ? body.databaseWrite : null,
    errorCode: typeof errorBody?.code === 'string' ? errorBody.code : error ? 'healthcheck_failed' : null,
    errorMessage: typeof errorBody?.message === 'string' ? errorBody.message : error ? 'Healthcheck request failed.' : null,
  };
}
