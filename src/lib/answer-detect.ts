export type DetectedAnswer = { hasAnswer: boolean; extracted?: string };

export function detectAnswer(input: string): DetectedAnswer {
  const s = input.trim();

  // "x = 5", "= 3.14", "≈ 22/7", % or unit suffixes
  const m1 = s.match(/\b([a-zA-Z]\w*)\s*(=|≈|~|≃|≅|:)\s*([-+]?\d+(?:[.,]\d+)?(?:\/\d+)?)(?:\s*[a-z%]+)?/);
  if (m1) return { hasAnswer: true, extracted: m1[0] };

  // "my answer is 12", "result is 30%"
  const m2 = s.match(/\b(my answer|i think|it equals|result is|equals)\b[:\s]*([-+]?\d+(?:[.,]\d+)?(?:\/\d+)?(?:\s*[a-z%]+)?)/i);
  if (m2) return { hasAnswer: true, extracted: m2[2] };

  // Lists like "2, 4, 6"
  const m3 = s.match(/\b\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?)+\b/);
  if (m3) return { hasAnswer: true, extracted: m3[0] };

  return { hasAnswer: false };
}