export function parsePhase6Envelope(responseText: string, expectedEnvelope: 'slots' | 'slot'): Record<string, unknown> {
  const responseJson = JSON.parse(responseText) as Record<string, unknown>;
  const rawValue = responseJson.content ?? (responseJson.data as Record<string, unknown> | undefined)?.content ?? responseJson;
  const rawText = typeof rawValue === 'string' ? rawValue.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim() : null;
  const parsed = rawText ? JSON.parse(rawText) : rawValue;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${expectedEnvelope.toUpperCase()}_ENVELOPE_FAILED`);
  const keys = Object.keys(parsed);
  if (keys.length !== 1 || keys[0] !== expectedEnvelope) throw new Error(`${expectedEnvelope.toUpperCase()}_ENVELOPE_FAILED`);
  const value = (parsed as Record<string, unknown>)[expectedEnvelope];
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${expectedEnvelope.toUpperCase()}_ENVELOPE_FAILED`);
  if (expectedEnvelope === 'slot' && Object.prototype.hasOwnProperty.call(value, 'slots')) throw new Error('SLOT_ENVELOPE_FAILED');
  return value as Record<string, unknown>;
}
