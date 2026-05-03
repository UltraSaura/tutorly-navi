const TECHNICAL_LABEL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\blearning modality\b/gi, "way to learn"],
  [/\bcognitive preference\b/gi, "way to learn"],
  [/\ban?\s+auditory learner\b/gi, "you"],
  [/\ban?\s+visual learner\b/gi, "you"],
  [/\ban?\s+kinesthetic learner\b/gi, "you"],
  [/\baudi(?:tory)?\s+learner\b/gi, "you"],
  [/\bvisual\s+learner\b/gi, "you"],
  [/\bkinesthetic\s+learner\b/gi, "you"],
];

export function toChildFriendlyExplanationText(text: string): string {
  return TECHNICAL_LABEL_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    text
  );
}
