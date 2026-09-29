export type ResolveEditionResult = {
  data: unknown;
  error: unknown;
};

type RpcClient = {
  rpc: (name: string, params: Record<string, unknown>) => {
    maybeSingle: () => Promise<ResolveEditionResult>;
  };
};

/**
 * Resolve a curriculum edition without treating Supabase's PostgREST builder
 * as a native Promise. Callers can inspect the returned error and decide
 * whether the documented curriculum fallback should run.
 */
export async function resolveEdition(
  client: RpcClient,
  params: Record<string, unknown>,
): Promise<ResolveEditionResult> {
  try {
    const result = await client.rpc('resolve_edition', params).maybeSingle();
    return {
      data: result?.data ?? null,
      error: result?.error ?? null,
    };
  } catch (error) {
    // Keep the caller's documented curriculum fallback available while
    // preserving the actual query failure for diagnostics.
    return { data: null, error };
  }
}
