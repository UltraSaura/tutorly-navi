import { ProblemSubmissionType } from '@/types/chat';

export interface SubmissionClassification {
  type: ProblemSubmissionType;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

const GROUPED_PATTERNS = [
  /vraie?\s+ou\s+fausse?/i,
  /vrai\s+ou\s+faux/i,
  /true\s+or\s+false/i,
  /yes\s+or\s+no/i,
  /pour\s+chaque\s+affirmation/i,
  /pour\s+chacune\s+d[’']entre\s+elles/i,
  /dire\s+si\s+elles?\s+est\s+vraie?\s+ou\s+fausse?/i,
  /affirmations?/i,
  /\bAffirmation\s+[A-Z]\s*[:：]/i,
  /chaque\s+r[ée]ponse\s+doit\s+[êe]tre\s+justifi/i,
  /\bQCM\b/i,
  /choisir\s+la\s+bonne\s+r[ée]ponse/i,
  /coche\s+la\s+bonne\s+r[ée]ponse/i,
  /entoure\s+la\s+bonne\s+r[ée]ponse/i,
  /multiple\s+choice/i,
];

const COMPLEX_PATTERNS = [
  /^\s*\d+\s*[\).]/m,
  /^\s*[a-z]\s*[\).]/im,
  /\b(exercice|probl[èe]me)\s+\d+/i,
  /\n\s*\n/,
];

const GROUPED_MULTIPART_PATTERNS = [
  /\bpartie\s+[A-Z]\b/i,
  /\b(rectangle|carr[ée]|triangle|cercle|figure|g[ée]om[ée]tr)/i,
  /\b(p[ée]rim[èe]tre|aire|longueur|cm|m²|cm²)\b/i,
  /\b(construire|tracer|dessiner|vraie\s+grandeur)\b/i,
  /\b(ABCD|EFGH|AB|BC|CD|AD|EF|FG|GH|HE)\b/,
];

export function classifyProblemSubmission(
  text: string,
  options: { hasAttachments?: boolean } = {}
): SubmissionClassification {
  const normalized = text.trim();
  const groupedMatches = GROUPED_PATTERNS.filter(pattern => pattern.test(normalized)).length;
  const affirmationCount = normalized.match(/\bAffirmation\s+[A-Z]\s*[:：]/gi)?.length || 0;
  const repeatedChoiceRows = normalized.match(/(?:^|\n)\s*(?:[A-Z]|\d+|[a-z])[\).]\s+.*\b(?:A\s*[).]|B\s*[).]|C\s*[).]|D\s*[).]|vrai|faux|true|false)\b/gi)?.length || 0;

  if (groupedMatches > 0 || affirmationCount >= 2 || repeatedChoiceRows >= 2) {
    return {
      type: 'grouped_choice_problem',
      confidence: 'high',
      reason: 'Grouped choice or repeated assertion signals were found.',
    };
  }

  const lineCount = normalized.split(/\n+/).filter(line => line.trim().length > 0).length;
  const labeledPartCount = normalized.match(/(?:^|\n)\s*(?:\d+|[a-z])\s*[\).]/gi)?.length || 0;
  const isLong = normalized.length > 220 || lineCount >= 5;
  const complexMatches = COMPLEX_PATTERNS.filter(pattern => pattern.test(normalized)).length;
  const groupedMultipartMatches = GROUPED_MULTIPART_PATTERNS.filter(pattern => pattern.test(normalized)).length;

  if (labeledPartCount >= 2 && groupedMultipartMatches >= 2) {
    return {
      type: 'grouped_problem',
      confidence: 'high',
      reason: 'Multi-part geometry or construction problem signals were found.',
    };
  }

  if (options.hasAttachments && (isLong || labeledPartCount > 0 || complexMatches > 0)) {
    return {
      type: 'complex_problem',
      confidence: 'medium',
      reason: 'Attachment content has multi-part or long-form structure.',
    };
  }

  if ((isLong && complexMatches >= 2) || labeledPartCount >= 2) {
    return {
      type: 'complex_problem',
      confidence: 'medium',
      reason: 'Long text contains multiple labeled parts.',
    };
  }

  return {
    type: 'simple_exercise',
    confidence: 'medium',
    reason: 'No grouped or complex problem signals were found.',
  };
}

export function isGroupedOrComplexSubmission(text: string, hasAttachments = false): boolean {
  return classifyProblemSubmission(text, { hasAttachments }).type !== 'simple_exercise';
}
