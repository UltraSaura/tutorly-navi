export type GenerationErrorCode = 'edge_unavailable' | 'unauthorized' | 'provider_error' | 'provider_malformed_json' | 'canonical_validation_failed' | 'pedagogical_validation_failed' | 'timeout' | 'unknown';

export const generationErrorMessages: Record<GenerationErrorCode, string> = {
  edge_unavailable: 'La fonction de génération est indisponible.',
  unauthorized: 'Vous n’êtes pas autorisé à générer cette leçon.',
  provider_error: 'Le fournisseur IA n’a pas pu générer le contenu.',
  provider_malformed_json: 'Le contenu généré n’a pas pu être lu correctement.',
  canonical_validation_failed: 'La leçon générée n’a pas le format attendu.',
  pedagogical_validation_failed: 'La leçon générée n’a pas passé les contrôles pédagogiques.',
  timeout: 'La génération a pris trop de temps.',
  unknown: 'Une erreur inattendue est survenue pendant la génération.',
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';

export function formatGenerationError(payload: unknown, fallback = generationErrorMessages.unknown): string {
  if (payload instanceof Error) return formatGenerationError(payload.message, fallback);
  if (isRecord(payload)) {
    const nested = isRecord(payload.error) ? payload.error : undefined;
    const code = String(nested?.code ?? payload.code ?? '') as GenerationErrorCode;
    if (code in generationErrorMessages) return generationErrorMessages[code];
    const message = nested?.message ?? payload.message ?? payload.details;
    if (typeof message === 'string' && message.trim() && message !== '[object Object]') return message;
    if (typeof payload.error === 'string' && payload.error.trim() && payload.error !== '[object Object]') return payload.error;
    if (nested?.error && typeof nested.error === 'string') return nested.error;
    return fallback;
  }
  const text = typeof payload === 'string' ? payload : '';
  if (/Failed to send a request|fetch failed|network/i.test(text)) return generationErrorMessages.edge_unavailable;
  if (/5 minutes|timed? out|timeout/i.test(text)) return generationErrorMessages.timeout;
  if (text && text !== '[object Object]') return text;
  return fallback;
}

export function getGenerationErrorTechnicalDetail(payload: unknown): string | undefined {
  if (payload instanceof Error) return payload.message;
  if (!isRecord(payload)) return undefined;
  const nested = isRecord(payload.error) ? payload.error : undefined;
  const detail = nested?.technicalDetail ?? payload.technicalDetail ?? nested?.details ?? payload.details;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (detail !== undefined) {
    try { return JSON.stringify(detail); } catch { return undefined; }
  }
  return undefined;
}
