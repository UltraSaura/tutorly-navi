import { semanticDuplicationDiagnostics } from './pedagogical-quality.ts';

type LessonBlock = Record<string, unknown>;
export type CompositionCleanupEvent = { path: string; action: 'takeaway_replaced' | 'key_points_simplified' | 'warning'; message: string };

const fractionTakeaways = [
  'Le numérateur compte les parts prises.',
  'Le dénominateur indique en combien de parts égales l’unité est partagée.',
  'Utilise le visuel pour repérer les parts égales.',
];

function isFraction(block: LessonBlock, topicName: string): boolean {
  return /fraction|numérateur|dénominateur|partie(?:s)?[- ]tout/i.test(`${topicName} ${String(block.title ?? '')} ${String(block.content ?? '')}`);
}

function replacementTakeaway(block: LessonBlock, topicName: string): string {
  const candidates = isFraction(block, topicName) ? [...fractionTakeaways, 'Utilise le visuel pour repérer les idées importantes.'] : ['Utilise le visuel pour repérer les idées importantes.'];
  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const diagnostics = semanticDuplicationDiagnostics({ ...block, takeaway: candidate });
    const score = diagnostics.reduce((total, item) => total + item.diagnostic.overlap * 10 + item.diagnostic.ratio, 0);
    if (score < bestScore) { best = candidate; bestScore = score; }
  }
  return best;
}

export function normalizeLessonComposition(lesson: Record<string, unknown>, topicName: string): { lesson: Record<string, unknown>; events: CompositionCleanupEvent[] } {
  const events: CompositionCleanupEvent[] = [];
  const sequence = Array.isArray(lesson.sequence) ? lesson.sequence.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || (raw as LessonBlock).type !== 'concept') return raw;
    const block = { ...(raw as LessonBlock) };
    const duplicates = semanticDuplicationDiagnostics(block);
    const takeawayDuplicate = duplicates.some((item) => item.fieldB === 'takeaway');
    if (takeawayDuplicate || typeof block.takeaway !== 'string' || !block.takeaway.trim()) {
      block.takeaway = replacementTakeaway(block, topicName);
      events.push({ path: `sequence[${index}].takeaway`, action: 'takeaway_replaced', message: 'Takeaway simplifié pour éviter une répétition.' });
    }
    if (Array.isArray(block.key_points)) {
      const seen = new Set<string>();
      const points = block.key_points.flatMap((point) => {
        if (!point || typeof point !== 'object' || Array.isArray(point)) return [];
        const item = point as LessonBlock;
        const label = String(item.label ?? '').trim();
        const text = String(item.text ?? '').trim();
        const signature = `${label.toLocaleLowerCase()}|${text.toLocaleLowerCase()}`;
        if (!label || !text || seen.has(signature)) return [];
        seen.add(signature);
        return [{ label, text }];
      }).slice(0, 4);
      if (points.length !== block.key_points.length) {
        block.key_points = points;
        events.push({ path: `sequence[${index}].key_points`, action: 'key_points_simplified', message: 'Key points simplifiés pour conserver des rôles distincts.' });
      }
    }
    const remaining = semanticDuplicationDiagnostics(block);
    if (remaining.length) events.push({ path: `sequence[${index}]`, action: 'warning', message: 'Répétition pédagogique résiduelle conservée comme avertissement.' });
    return block;
  }) : lesson.sequence;
  return { lesson: { ...lesson, sequence }, events };
}
