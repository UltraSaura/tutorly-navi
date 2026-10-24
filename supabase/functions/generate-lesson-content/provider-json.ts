export type SafeJsonResult =
  | { ok: true; value: unknown; attemptedRepair: boolean }
  | { ok: false; attemptedRepair: boolean; category: 'empty' | 'malformed_json' | 'ambiguous_json' | 'unsupported_shape' };

export type ProviderResponseDiagnostics = {
  httpStatus: number;
  contentType: string | null;
  bodyLength: number;
  choiceCount: number | null;
  finishReason: string | null;
  contentPresent: boolean;
  contentNonEmpty: boolean;
  contentSha256: string | null;
  parseState: string;
};

export function extractProviderContent(envelope: Record<string, unknown>): { found: boolean; value: unknown } {
  if (Object.prototype.hasOwnProperty.call(envelope, 'content')) {
    return { found: true, value: envelope.content };
  }
  const nested = envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data)
    ? envelope.data as Record<string, unknown>
    : null;
  if (nested && Object.prototype.hasOwnProperty.call(nested, 'content')) {
    return { found: true, value: nested.content };
  }
  return { found: false, value: undefined };
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function buildProviderResponseDiagnostics(input: {
  httpStatus: number;
  contentType: string | null;
  bodyText: string;
  envelope?: Record<string, unknown> | null;
  content: unknown;
  parseState: string;
}): Promise<ProviderResponseDiagnostics> {
  const contentPresent = input.content !== undefined && input.content !== null;
  const contentText = typeof input.content === 'string' ? input.content : null;
  const providerMetadata = input.envelope?.providerMetadata;
  const metadata = providerMetadata && typeof providerMetadata === 'object' && !Array.isArray(providerMetadata)
    ? providerMetadata as Record<string, unknown>
    : null;
  const choices = Array.isArray(input.envelope?.choices)
    ? input.envelope?.choices.length
    : typeof metadata?.choiceCount === 'number' ? metadata.choiceCount : null;
  return {
    httpStatus: input.httpStatus,
    contentType: input.contentType,
    bodyLength: input.bodyText.length,
    choiceCount: choices,
    finishReason: typeof metadata?.finishReason === 'string' ? metadata.finishReason : null,
    contentPresent,
    contentNonEmpty: contentText !== null && contentText.trim().length > 0,
    contentSha256: contentText === null ? null : await sha256Hex(contentText),
    parseState: input.parseState,
  };
}

const cleanText = (input: string): { text: string; changed: boolean } => {
  let text = input.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  text = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  return { text, changed: text !== input };
};

const removeTrailingCommas = (value: string): string => value.replace(/,\s*([}\]])/g, '$1');

function balancedCandidates(text: string): string[] {
  const candidates: string[] = [];
  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== '{' && text[start] !== '[') continue;
    let prefixDepth = 0;
    let prefixQuote = false;
    let prefixEscaped = false;
    for (let prefixIndex = 0; prefixIndex < start; prefixIndex += 1) {
      const prefixChar = text[prefixIndex];
      if (prefixQuote) {
        if (prefixEscaped) prefixEscaped = false;
        else if (prefixChar === '\\') prefixEscaped = true;
        else if (prefixChar === '"') prefixQuote = false;
        continue;
      }
      if (prefixChar === '"') prefixQuote = true;
      else if (prefixChar === '{' || prefixChar === '[') prefixDepth += 1;
      else if (prefixChar === '}' || prefixChar === ']') prefixDepth -= 1;
    }
    if (prefixDepth !== 0) continue;
    const opening = text[start];
    const closing = opening === '{' ? '}' : ']';
    let depth = 0;
    let quote = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quote = false;
        continue;
      }
      if (char === '"') { quote = true; continue; }
      if (char === opening) depth += 1;
      else if (char === closing) depth -= 1;
      if (depth === 0) { candidates.push(text.slice(start, index + 1)); break; }
    }
  }
  const unique = [...new Set(candidates)];
  // Nested objects are part of the same response, not separate candidate
  // responses. Keep only maximal balanced candidates so two top-level JSON
  // values remain distinguishable and can be rejected as ambiguous.
  return unique.filter((candidate) => !unique.some((other) => other !== candidate && other.includes(candidate))).sort((a, b) => b.length - a.length);
}

export function parseProviderJsonSafely(raw: unknown): SafeJsonResult {
  if (raw && typeof raw === 'object') return { ok: true, value: raw, attemptedRepair: false };
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false, attemptedRepair: false, category: 'empty' };
  // JSON string values may legitimately contain curly quotation marks and
  // control-character escapes. Never normalize valid JSON before parsing it.
  try {
    return { ok: true, value: JSON.parse(raw), attemptedRepair: false };
  } catch { /* retain the existing bounded legacy-envelope handling */ }
  const cleaned = cleanText(raw);
  const candidates = [cleaned.text, ...balancedCandidates(cleaned.text)].filter((value, index, all) => all.indexOf(value) === index);
  let attemptedRepair = cleaned.changed;
  const parsedCandidates: unknown[] = [];
  for (const candidate of candidates) {
    try {
      parsedCandidates.push(JSON.parse(candidate));
      continue;
    } catch {
      const repaired = removeTrailingCommas(candidate);
      if (repaired !== candidate) attemptedRepair = true;
      try { parsedCandidates.push(JSON.parse(repaired)); } catch { /* try the next bounded candidate */ }
    }
  }
  if (parsedCandidates.length === 1) return { ok: true, value: parsedCandidates[0], attemptedRepair: true };
  if (parsedCandidates.length > 1) return { ok: false, attemptedRepair, category: 'ambiguous_json' };
  return { ok: false, attemptedRepair, category: 'malformed_json' };
}
