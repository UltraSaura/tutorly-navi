export type GenerationErrorCode = 'edge_unavailable' | 'unauthorized' | 'provider_error' | 'provider_malformed_json' | 'provider_invalid_lesson' | 'canonical_validation_failed' | 'pedagogical_validation_failed' | 'timeout' | 'unknown';

export const generationErrorMessages: Record<GenerationErrorCode, string> = {
  edge_unavailable: 'La fonction de génération est indisponible.',
  unauthorized: 'Vous n’êtes pas autorisé à générer cette leçon.',
  provider_error: 'Le fournisseur IA n’a pas pu générer le contenu.',
  provider_malformed_json: 'Le contenu généré n’a pas pu être lu correctement.',
  provider_invalid_lesson: 'La leçon générée est incomplète ou invalide.',
  canonical_validation_failed: 'La leçon générée n’a pas le format attendu.',
  pedagogical_validation_failed: 'La leçon générée n’a pas passé les contrôles pédagogiques.',
  timeout: 'La génération a pris trop de temps.',
  unknown: 'Une erreur inattendue est survenue pendant la génération.',
};

export type GenerationErrorDetails = {
  httpStatus?: number;
  code?: string;
  message: string;
  technicalDetail?: string;
  requestId?: string;
  providerCalls?: number;
  level?: number;
  stage?: string;
  validationCategory?: string;
  build?: string;
  promptVersion?: string;
  retryCount?: number;
  parseStage?: string;
  progress?: unknown[];
  validation?: unknown;
  providerDiagnostics?: ProviderDiagnostics;
};

export type ProviderDiagnostics = {
  finishReason?: string;
  contentLength?: number;
  choiceCount?: number;
  parseState?: string;
  bodyLength?: number;
  syntaxError?: {
    message?: string;
    position?: number;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function safeSerialize(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  try {
    const serialized = JSON.stringify(value);
    return serialized && serialized !== '{}' ? serialized : undefined;
  } catch {
    return undefined;
  }
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function mapProviderDiagnostics(value: unknown): ProviderDiagnostics | undefined {
  if (!isRecord(value)) return undefined;
  const diagnostics: ProviderDiagnostics = {
    finishReason: stringValue(value.finishReason),
    contentLength: finiteNumber(value.contentLength),
    choiceCount: finiteNumber(value.choiceCount),
    parseState: stringValue(value.parseState),
    bodyLength: finiteNumber(value.bodyLength),
  };
  if (isRecord(value.syntaxError)) {
    diagnostics.syntaxError = {
      message: stringValue(value.syntaxError.message),
      position: finiteNumber(value.syntaxError.position),
    };
  }
  const hasValue = Object.values(diagnostics).some((item) => item !== undefined);
  if (!hasValue) return undefined;
  return diagnostics;
}

export function formatProviderDiagnostics(diagnostics?: ProviderDiagnostics): string | undefined {
  if (!diagnostics) return undefined;
  const fields = [
    diagnostics.finishReason ? `finishReason=${diagnostics.finishReason}` : undefined,
    diagnostics.contentLength !== undefined ? `contentLength=${diagnostics.contentLength}` : undefined,
    diagnostics.choiceCount !== undefined ? `choiceCount=${diagnostics.choiceCount}` : undefined,
    diagnostics.parseState ? `parseState=${diagnostics.parseState}` : undefined,
    diagnostics.bodyLength !== undefined ? `bodyLength=${diagnostics.bodyLength}` : undefined,
    diagnostics.syntaxError?.message ? `syntaxError=${diagnostics.syntaxError.message}` : undefined,
    diagnostics.syntaxError?.position !== undefined ? `syntaxPosition=${diagnostics.syntaxError.position}` : undefined,
  ].filter(Boolean);
  return fields.length ? fields.join(', ') : undefined;
}

export function getGenerationErrorDetails(payload: unknown, fallback = generationErrorMessages.unknown): GenerationErrorDetails {
  if (payload instanceof Error) {
    const error = payload as Error & Partial<GenerationErrorDetails> & { context?: unknown; failedLevel?: number; failureStage?: string };
    const context = isRecord(error.context) ? error.context : undefined;
    const details = getGenerationErrorDetails({
      ...(context ?? {}),
      message: error.message,
      httpStatus: error.httpStatus ?? context?.status,
      code: error.code,
      technicalDetail: error.technicalDetail,
      requestId: error.requestId,
      providerCalls: error.providerCalls,
      level: error.level ?? error.failedLevel,
      stage: error.stage ?? error.failureStage,
      validationCategory: error.validationCategory,
      build: error.build,
      promptVersion: error.promptVersion,
      retryCount: error.retryCount,
      parseStage: error.parseStage,
      progress: error.progress,
      validation: error.validation,
      providerDiagnostics: error.providerDiagnostics,
    }, fallback);
    return details;
  }

  if (typeof payload === 'string') {
    const message = payload.trim() || fallback;
    return {
      message: message.includes('[object Object]') ? fallback : message,
      technicalDetail: message.includes('[object Object]') ? undefined : message,
    };
  }

  const root = isRecord(payload) ? payload : {};
  const nested = isRecord(root.error) ? root.error : {};
  const code = stringValue(nested.code) ?? stringValue(root.code);
  const rawMessage = stringValue(nested.message) ?? stringValue(root.message) ?? stringValue(root.error);
  const mappedMessage = code && code in generationErrorMessages ? generationErrorMessages[code as GenerationErrorCode] : undefined;
  const message = rawMessage && !rawMessage.includes('[object Object]') ? rawMessage : mappedMessage ?? fallback;
  const rawTechnical = nested.technicalDetail ?? root.technicalDetail ?? nested.details ?? root.details;
  const technicalDetail = typeof rawTechnical === 'string'
    ? rawTechnical
    : safeSerialize(rawTechnical);
  const details: GenerationErrorDetails = {
    httpStatus: finiteNumber(nested.httpStatus) ?? finiteNumber(root.httpStatus) ?? finiteNumber(root.status),
    code,
    message,
    technicalDetail: technicalDetail && !technicalDetail.includes('[object Object]') ? technicalDetail : undefined,
    requestId: stringValue(nested.requestId) ?? stringValue(root.requestId),
    providerCalls: finiteNumber(nested.providerCalls) ?? finiteNumber(root.providerCalls),
    level: finiteNumber(nested.level) ?? finiteNumber(root.level),
    stage: stringValue(nested.stage) ?? stringValue(root.stage) ?? stringValue(nested.failureStage) ?? stringValue(root.failureStage),
    validationCategory: stringValue(nested.validationCategory) ?? stringValue(root.validationCategory),
    build: stringValue(nested.build) ?? stringValue(root.build),
    promptVersion: stringValue(nested.promptVersion) ?? stringValue(root.promptVersion),
    retryCount: finiteNumber(nested.retryCount) ?? finiteNumber(root.retryCount),
    parseStage: stringValue(nested.parseStage) ?? stringValue(root.parseStage),
    progress: Array.isArray(nested.progress) ? nested.progress : Array.isArray(root.progress) ? root.progress : undefined,
    validation: nested.validation ?? root.validation,
    providerDiagnostics: mapProviderDiagnostics(nested.providerDiagnostics ?? root.providerDiagnostics),
  };
  return details;
}

export function formatGenerationErrorDetails(details: GenerationErrorDetails): string {
  if (details.validationCategory === 'geometry' && details.level !== undefined && /clock/i.test(details.technicalDetail ?? '')) {
    return `Validation failed in level ${details.level}: the clock visual has an invalid hour or minute.`;
  }
  if (details.code === 'provider_malformed_json') {
    const attempt = details.retryCount && details.retryCount > 0 ? 'après le retry JSON borné' : 'sur la réponse initiale';
    return `Le contenu généré n’a pas pu être lu correctement (${attempt}).`;
  }
  const prefix = details.stage === 'pre_generation' ? 'Generation did not start' :
    details.stage === 'provider_failure' ? 'Provider failure' :
      details.stage === 'validation_failure' ? 'Validation failure' :
        details.stage === 'database_save' ? 'Database save failure' : 'Generation failed';
  return `${prefix}: ${details.message}`;
}

export function formatAdminGenerationError(payload: unknown, fallback = generationErrorMessages.unknown): string {
  const details = getGenerationErrorDetails(payload, fallback);
  const summary = formatGenerationErrorDetails(details);
  const diagnostic = [
    details.httpStatus !== undefined ? `HTTP ${details.httpStatus}` : undefined,
    details.code ? `code=${details.code}` : undefined,
    details.requestId ? `requestId=${details.requestId}` : undefined,
    details.level !== undefined ? `level=${details.level}` : undefined,
    details.validationCategory ? `validation=${details.validationCategory}` : undefined,
    details.stage ? `stage=${details.stage}` : undefined,
    details.providerCalls !== undefined ? `providerCalls=${details.providerCalls}` : undefined,
    details.retryCount !== undefined ? `retryCount=${details.retryCount}` : undefined,
    details.parseStage ? `parseStage=${details.parseStage}` : undefined,
    details.technicalDetail,
    formatProviderDiagnostics(details.providerDiagnostics),
  ].filter(Boolean).join(' · ');
  return diagnostic ? `${summary} — ${diagnostic}` : summary;
}

export function formatGenerationDiagnostic(payload: unknown, fallback = generationErrorMessages.unknown): string {
  const details = getGenerationErrorDetails(payload, fallback);
  const fields = [
    details.message,
    details.httpStatus !== undefined ? `HTTP ${details.httpStatus}` : undefined,
    details.code ? `code=${details.code}` : undefined,
    details.requestId ? `requestId=${details.requestId}` : undefined,
    details.providerCalls !== undefined ? `providerCalls=${details.providerCalls}` : undefined,
    details.retryCount !== undefined ? `retryCount=${details.retryCount}` : undefined,
    details.parseStage ? `parseStage=${details.parseStage}` : undefined,
    details.level !== undefined ? `level=${details.level}` : undefined,
    details.stage ? `stage=${details.stage}` : undefined,
    details.technicalDetail,
    formatProviderDiagnostics(details.providerDiagnostics),
  ].filter(Boolean);
  return fields.join(' · ') || details.message;
}

export function formatGenerationError(payload: unknown, fallback = generationErrorMessages.unknown): string {
  if (payload instanceof Error) return formatGenerationError(payload.message, fallback);
  if (isRecord(payload)) {
    const nested = isRecord(payload.error) ? payload.error : undefined;
    const code = String(nested?.code ?? payload.code ?? '') as GenerationErrorCode;
    if (code in generationErrorMessages) return generationErrorMessages[code];
    const message = nested?.message ?? payload.message ?? payload.details;
    if (typeof message === 'string' && message.trim() && !message.includes('[object Object]')) return message;
    if (typeof payload.error === 'string' && payload.error.trim() && !payload.error.includes('[object Object]')) return payload.error;
    if (nested?.error && typeof nested.error === 'string' && !nested.error.includes('[object Object]')) return nested.error;
    return fallback;
  }
  const text = typeof payload === 'string' ? payload : '';
  if (/Failed to send a request|fetch failed|network/i.test(text)) return generationErrorMessages.edge_unavailable;
  if (/5 minutes|timed? out|timeout/i.test(text)) return generationErrorMessages.timeout;
  if (text && !text.includes('[object Object]')) return text;
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
