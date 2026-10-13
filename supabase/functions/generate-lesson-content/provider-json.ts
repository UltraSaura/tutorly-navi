export type SafeJsonResult =
  | { ok: true; value: unknown; attemptedRepair: boolean }
  | { ok: false; attemptedRepair: boolean; category: 'empty' | 'malformed_json' | 'unsupported_shape' };

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
    if (text.slice(0, start).includes('{') || text.slice(0, start).includes('[')) continue;
    if (text[start] !== '{' && text[start] !== '[') continue;
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
  return candidates.sort((a, b) => b.length - a.length);
}

export function parseProviderJsonSafely(raw: unknown): SafeJsonResult {
  if (raw && typeof raw === 'object') return { ok: true, value: raw, attemptedRepair: false };
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false, attemptedRepair: false, category: 'empty' };
  const cleaned = cleanText(raw);
  const candidates = [cleaned.text, ...balancedCandidates(cleaned.text)].filter((value, index, all) => all.indexOf(value) === index);
  let attemptedRepair = cleaned.changed;
  for (const candidate of candidates) {
    try {
      return { ok: true, value: JSON.parse(candidate), attemptedRepair };
    } catch {
      const repaired = removeTrailingCommas(candidate);
      if (repaired !== candidate) attemptedRepair = true;
      try { return { ok: true, value: JSON.parse(repaired), attemptedRepair }; } catch { /* try the next bounded candidate */ }
    }
  }
  return { ok: false, attemptedRepair, category: 'malformed_json' };
}
