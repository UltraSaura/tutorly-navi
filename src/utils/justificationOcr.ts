export interface JustificationOcrResult {
  rawText: string;
  normalizedText?: string;
  confidence?: number;
  warnings?: string[];
  error?: string;
}

export interface JustificationDocumentProcessorRequest {
  fileData: string;
  fileType: string;
  fileName: string;
  subjectId?: string;
  mode: 'justification';
  rowPrompt?: string;
  problemContext?: string;
}

export function normalizeJustificationOcrPayload(payload: any): JustificationOcrResult {
  const source = payload?.justification || payload?.justificationOcr || payload || {};
  const rawText = typeof source.rawText === 'string'
    ? source.rawText.trim()
    : typeof payload?.rawText === 'string'
      ? payload.rawText.trim()
      : '';
  const normalizedText = typeof source.normalizedText === 'string'
    ? source.normalizedText.trim()
    : typeof payload?.normalizedText === 'string'
      ? payload.normalizedText.trim()
      : undefined;
  const confidence = typeof source.confidence === 'number'
    ? source.confidence
    : typeof payload?.confidence === 'number'
      ? payload.confidence
      : undefined;
  const warnings = Array.isArray(source.warnings)
    ? source.warnings.filter((warning: unknown): warning is string => typeof warning === 'string' && warning.trim().length > 0)
    : Array.isArray(payload?.warnings)
      ? payload.warnings.filter((warning: unknown): warning is string => typeof warning === 'string' && warning.trim().length > 0)
      : undefined;

  return {
    rawText: normalizedText || rawText,
    normalizedText,
    confidence,
    warnings,
  };
}

export function buildJustificationDocumentRequest(input: {
  fileData: string;
  fileType: string;
  fileName: string;
  subjectId?: string;
  rowPrompt?: string;
  problemContext?: string;
}): JustificationDocumentProcessorRequest {
  return {
    fileData: input.fileData,
    fileType: input.fileType,
    fileName: input.fileName,
    subjectId: input.subjectId,
    mode: 'justification',
    rowPrompt: input.rowPrompt,
    problemContext: input.problemContext,
  };
}
