type PedagogyIssue = { path: string; message: string };
import { determineVisualRequirement, isSupportedVisualKind } from './visual-policy.ts';
import { geometryVisualDataErrors } from './geometry-visual-contract.ts';

export const PEDAGOGICAL_CONCEPT_MAX_WORDS = 55;
export const PEDAGOGICAL_TAKEAWAY_MAX_WORDS = 24;

const PEDAGOGY_STOP_WORDS = new Set('le la les un une des de du et en avec pour sur dans une est sont là ce cette ces que qui comme avec au aux par chaque il elle on se'.split(/\s+/));
export function meaningfulTokens(value: unknown): Set<string> {
  if (typeof value !== 'string') return new Set();
  return new Set(value.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-zà-ÿ]{4,}/g)?.filter((token) => !PEDAGOGY_STOP_WORDS.has(token)) ?? []);
}
export type SemanticOverlapDiagnostic = {
  overlap: number;
  ratio: number;
  leftTokens: string[];
  rightTokens: string[];
};

export type CompositionRepairOutput = {
  content: string;
  key_points: Array<{ label: string; text: string }>;
  takeaway: string;
};

export function validateCompositionRepairOutput(value: unknown): { success: true; value: CompositionRepairOutput } | { success: false; issues: string[] } {
  const issues: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { success: false, issues: ['output must be an object'] };
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate).sort();
  if (keys.some((key) => !['content', 'key_points', 'takeaway'].includes(key))) issues.push('output contains fields outside content, key_points, takeaway');
  if (typeof candidate.content !== 'string' || !candidate.content.trim()) issues.push('content must be a non-empty string');
  if (!Array.isArray(candidate.key_points) || candidate.key_points.length < 1 || candidate.key_points.length > 6) issues.push('key_points must contain 1–6 items');
  else candidate.key_points.forEach((point, index) => {
    if (!point || typeof point !== 'object' || Array.isArray(point)) return issues.push(`key_points[${index}] must be an object`);
    const item = point as Record<string, unknown>;
    if (typeof item.label !== 'string' || !item.label.trim()) issues.push(`key_points[${index}].label must be a non-empty string`);
    if (typeof item.text !== 'string' || !item.text.trim()) issues.push(`key_points[${index}].text must be a non-empty string`);
    if (Object.keys(item).some((key) => !['label', 'text'].includes(key))) issues.push(`key_points[${index}] contains an unsupported field`);
  });
  if (typeof candidate.takeaway !== 'string' || !candidate.takeaway.trim()) issues.push('takeaway must be a non-empty string');
  if (issues.length) return { success: false, issues };
  return { success: true, value: { content: candidate.content as string, key_points: candidate.key_points as CompositionRepairOutput['key_points'], takeaway: candidate.takeaway as string } };
}

export function semanticOverlap(a: unknown, b: unknown): SemanticOverlapDiagnostic {
  const left = meaningfulTokens(a); const right = meaningfulTokens(b);
  if (left.size < 2 || right.size < 2) return { overlap: 0, ratio: 0, leftTokens: [...left], rightTokens: [...right] };
  const overlap = [...left].filter((token) => right.has(token)).length;
  return { overlap, ratio: overlap / Math.min(left.size, right.size), leftTokens: [...left], rightTokens: [...right] };
}

function substantiallyRepeats(a: unknown, b: unknown): boolean {
  const diagnostic = semanticOverlap(a, b);
  return diagnostic.overlap >= 2 && diagnostic.ratio >= 0.65;
}

function keyPointsTakeawayOverlap(keyPoints: unknown, takeaway: unknown): SemanticOverlapDiagnostic {
  const diagnostic = semanticOverlap(keyPoints, takeaway);
  const takeawayTokens = meaningfulTokens(takeaway);
  return {
    ...diagnostic,
    // A concise factual key-point list will naturally reuse the concept's
    // nouns. Measure this pair against the actionable takeaway, while the
    // content↔takeaway check remains strict and catches substantive copying.
    ratio: takeawayTokens.size ? diagnostic.overlap / takeawayTokens.size : 0,
  };
}

// Vocabulary that legitimately repeats between a concept and its key points:
// instructional connectors and time-unit names (a time lesson must name
// seconde/minute/heure/jour in both places). Only used for the
// content↔key_point comparison; takeaway checks stay strict.
export const KEY_POINT_EXPECTED_VOCABULARY = new Set((
  'puis donc alors ensuite aussi encore toujours faut peut veut font fait faire mesure mesurer compte compter lire regarde observe '
  + 'unite unites seconde secondes minute minutes heure heures jour jours semaine semaines mois annee annees siecle siecles duree durees '
  + 'temps horloge aiguille aiguilles petite grande midi minuit matin soir avant apres pendant entre plus moins egale egal vaut valent'
).split(/\s+/));

function keyPointContentTokens(value: unknown): Set<string> {
  return new Set([...meaningfulTokens(value)].filter((token) => !KEY_POINT_EXPECTED_VOCABULARY.has(token)));
}

function normalizedStatement(value: unknown): string {
  return String(value ?? '').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

// Compare statements, not the proportion of shared domain vocabulary. Keep
// units, geometry nouns, quantities and negation: they can distinguish facts.
function statementWords(value: unknown): string[] {
  const grammar = new Set('le la les un une des de du et en avec pour sur dans est sont ce cette ces que qui comme au aux par chaque il elle on se l d'.split(' '));
  return normalizedStatement(value).split(' ').filter((word) => word && !grammar.has(word))
    .map((word) => word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word);
}

function copiedKeyPoint(a: unknown, b: unknown): boolean {
  const left = statementWords(a);
  const right = statementWords(b);
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  if (shorter.length < 3) return false;
  // Reordered copies still express the same complete fact.
  if (left.length === right.length && [...left].sort().join(' ') === [...right].sort().join(' ')) return true;
  // A whole factual statement embedded in another is a copy/subset. Merely
  // sharing rectangle/sommets/quatre is insufficient without the other words.
  return longer.some((_word, index) => shorter.every((word, offset) => longer[index + offset] === word));
}

export function keyPointContentOverlap(content: unknown, pointText: unknown): SemanticOverlapDiagnostic {
  const left = keyPointContentTokens(content); const right = keyPointContentTokens(pointText);
  const rawPoint = normalizedStatement(pointText);
  // A key point whose whole statement is copied verbatim from the content is a
  // genuine duplicate, whatever its vocabulary.
  if (rawPoint.split(' ').length >= 4 && normalizedStatement(content).includes(rawPoint)) {
    return { overlap: right.size || rawPoint.split(' ').length, ratio: 1, leftTokens: [...left], rightTokens: [...right] };
  }
  if (left.size < 2 || right.size < 2) return { overlap: 0, ratio: 0, leftTokens: [...left], rightTokens: [...right] };
  const overlap = [...right].filter((token) => left.has(token)).length;
  return { overlap, ratio: overlap / right.size, leftTokens: [...left], rightTokens: [...right] };
}

export function semanticDuplicationDiagnostics(block: Record<string, unknown>): Array<{ fieldA: string; fieldB: string; diagnostic: SemanticOverlapDiagnostic; reason: string }> {
  const keyPoints = Array.isArray(block.key_points) ? block.key_points as Array<Record<string, unknown>> : [];
  const duplicateReason = 'partagent trop de tokens pédagogiquement significatifs.';
  const keyPointDuplicates = keyPoints.flatMap((point, index) => {
    const pointText = `${String(point.label ?? '')} ${String(point.text ?? '')}`;
    const diagnostic = keyPointContentOverlap(block.content, String(point.text ?? ''));
    if (diagnostic.ratio === 1 && diagnostic.overlap > 0 && normalizedStatement(block.content).includes(normalizedStatement(point.text))) {
      return [{ fieldA: 'content', fieldB: `key_points[${index}]`, diagnostic, reason: duplicateReason }];
    }
    // Short learning takeaways are intentionally allowed to name the same
    // essential terms as the explanation (for example “4 angles droits”).
    // Reject only a long key point that copies most of the explanation.
    if (keyPointContentTokens(pointText).size <= 5) return [];
    const full = keyPointContentOverlap(block.content, pointText);
    if (full.overlap < 2 || full.ratio < 0.65) return [];
    return [{ fieldA: 'content', fieldB: `key_points[${index}]`, diagnostic: full, reason: duplicateReason }];
  });
  // Exact/normalized duplicates and whole-statement copies/subsets. No raw
  // token-overlap threshold is used to reject a pair of key points.
  keyPoints.forEach((point, index) => {
    const statement = normalizedStatement(point.text);
    if (!statement) return;
    keyPoints.slice(0, index).forEach((previousPoint, previous) => {
      const identical = normalizedStatement(previousPoint.text) === statement;
      if (!identical && !copiedKeyPoint(previousPoint.text, point.text)) return;
      const diagnostic = semanticOverlap(previousPoint.text, point.text);
      keyPointDuplicates.push({ fieldA: `key_points[${previous}]`, fieldB: `key_points[${index}]`, diagnostic, reason: `Les key_points répètent la même idée : key_points[${previous}].text et key_points[${index}].text ${identical ? 'sont identiques après normalisation' : 'contiennent une copie ou un sous-ensemble du même énoncé'} (${JSON.stringify(statement)}). Fournir deux phrases complètes exprimant des idées distinctes.` });
    });
  });
  const keyPointText = keyPoints.map((point) => `${String(point.label ?? '')} ${String(point.text ?? '')}`).join(' ');
  const pairs: Array<[string, unknown, string, unknown]> = [
    ['content', block.content, 'takeaway', block.takeaway],
    ['key_points', keyPointText, 'takeaway', block.takeaway],
  ];
  return [...keyPointDuplicates, ...pairs.flatMap(([fieldA, valueA, fieldB, valueB]) => {
    const diagnostic = fieldA === 'key_points' && fieldB === 'takeaway'
      ? keyPointsTakeawayOverlap(valueA, valueB)
      : semanticOverlap(valueA, valueB);
    if (diagnostic.overlap < 2 || diagnostic.ratio < 0.65) return [];
    return [{ fieldA, fieldB, diagnostic, reason: `${fieldA} et ${fieldB} ${duplicateReason}` }];
  })];
}

export function pedagogicalIssues(lesson: Record<string, unknown>, grade: string, topicName: string): PedagogyIssue[] {
  const issues: PedagogyIssue[] = [];
  const primary = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'].includes(grade);
  if (!primary) return issues;
  const sequence = Array.isArray(lesson.sequence) ? lesson.sequence as Array<Record<string, unknown>> : [];
  const concepts = sequence.filter((block) => block.type === 'concept');
  concepts.forEach((block) => {
    const conceptIndex = sequence.indexOf(block);
    const content = typeof block.content === 'string' ? block.content.trim() : '';
    const words = content ? content.split(/\s+/).length : 0;
    if (words > 90) issues.push({ path: `sequence[${conceptIndex}].content`, message: `Concept trop long (${words} mots); découper en petites idées.` });
    const visualData = block.visual && typeof block.visual === 'object' ? (block.visual as Record<string, unknown>).data : null;
    const visualKind = block.visual && typeof block.visual === 'object' ? String((block.visual as Record<string, unknown>).kind ?? '') : '';
    const structured = Boolean(block.visual || Array.isArray(block.key_points) || typeof block.takeaway === 'string');
    const visualPolicy = determineVisualRequirement(block);
    if (structured && words > PEDAGOGICAL_CONCEPT_MAX_WORDS) issues.push({ path: `sequence[${conceptIndex}].content`, message: `Concept structuré trop long (${words} mots); garder une introduction de 1 à 3 phrases.` });
    if (visualPolicy.requirement === 'required' && !block.visual) issues.push({ path: `sequence[${conceptIndex}].visual`, message: `Visuel requis (${visualPolicy.suggestedKinds.join('|')}): ${visualPolicy.reason}` });
    if (visualPolicy.requirement === 'required' && block.visual && !visualPolicy.suggestedKinds.includes(visualKind)) issues.push({ path: `sequence[${conceptIndex}].visual.kind`, message: `Visuel incompatible: attendu ${visualPolicy.suggestedKinds.join('|')}, reçu ${visualKind || 'absent'}.` });
    if (block.visual && !isSupportedVisualKind(visualKind)) issues.push({ path: `sequence[${conceptIndex}].visual.kind`, message: `Type de visuel non pris en charge: ${visualKind || 'absent'}.` });
    if (block.visual) geometryVisualDataErrors(visualKind, (block.visual as Record<string, unknown>).data, `sequence[${conceptIndex}].visual.data`).forEach((item) => issues.push({ path: item.path, message: item.message }));
    const visibleClockIdea = visualPolicy.suggestedKinds.includes('clock');
    if (visibleClockIdea && visualKind === 'clock' && visualData && typeof visualData === 'object') {
      const d = visualData as Record<string, unknown>;
      const statedHour = content.match(/(?:petite aiguille|heure)[^\d]{0,30}(\d{1,2})/i)?.[1];
      if (statedHour && Number(d.hour) !== Number(statedHour)) issues.push({ path: `sequence[${conceptIndex}].visual.data.hour`, message: 'L’heure du visuel ne correspond pas au texte du concept.' });
      if (/grande aiguille[^.]{0,30}(?:sur )?12/i.test(content) && Number(d.minute ?? 0) !== 0) issues.push({ path: `sequence[${conceptIndex}].visual.data.minute`, message: 'La grande aiguille sur 12 exige minute=0.' });
    }
    if (block.visual) {
      const hasVisualData = visualData && typeof visualData === 'object'
        ? Object.keys(visualData as Record<string, unknown>).length > 0
        : Array.isArray(visualData) && visualData.length > 0;
      if (!hasVisualData) issues.push({ path: `sequence[${conceptIndex}].visual.data`, message: 'Le visuel doit contenir des données pédagogiques.' });
      if (!Array.isArray(block.key_points) || block.key_points.length < 1 || block.key_points.length > 4) issues.push({ path: `sequence[${conceptIndex}].key_points`, message: 'Un concept visuel doit séparer ses idées en 1 à 4 key_points.' });
      else {
        const seen = new Set<string>();
        block.key_points.forEach((point: unknown, pointIndex: number) => {
          const item = point && typeof point === 'object' ? point as Record<string, unknown> : {};
          const signature = `${String(item.label ?? '').trim().toLowerCase()}|${String(item.text ?? '').trim().toLowerCase()}`;
          if (seen.has(signature)) issues.push({ path: `sequence[${conceptIndex}].key_points[${pointIndex}]`, message: 'Les key_points doivent apporter des idées distinctes.' });
          seen.add(signature);
        });
      }
      if (typeof block.takeaway !== 'string' || !block.takeaway.trim()) issues.push({ path: `sequence[${conceptIndex}].takeaway`, message: 'Un concept visuel doit fournir un takeaway.' });
      else if (block.takeaway.trim().split(/\s+/).length > PEDAGOGICAL_TAKEAWAY_MAX_WORDS) issues.push({ path: `sequence[${conceptIndex}].takeaway`, message: 'Le takeaway doit rester concis.' });
    }
    for (const duplicate of semanticDuplicationDiagnostics(block)) {
      const pathField = duplicate.fieldB === 'key_points' || duplicate.fieldB.startsWith('key_points[') ? 'key_points' : 'takeaway';
      const d = duplicate.diagnostic;
      issues.push({ path: `sequence[${conceptIndex}].${pathField}`, message: `${duplicate.reason} overlap=${d.overlap}, ratio=${d.ratio.toFixed(2)}, tokensA=[${d.leftTokens.join(', ')}], tokensB=[${d.rightTokens.join(', ')}].` });
    }
  });
  const hasInteraction = sequence.some((block) => ['prediction', 'student_try', 'feedback_checkpoint'].includes(String(block.type)));
  if (!hasInteraction) issues.push({ path: 'sequence', message: 'Le niveau primaire doit proposer une interaction avant la maîtrise.' });
  const visualTopic = /durée|heure|fraction|angle|triangle|rectangle|cercle|géométr|repère|solide|conversion/i.test(`${topicName} ${String(lesson.lesson_goal ?? '')}`);
  // A deterministic visual may be a standalone block or attached to the
  // concept it explains. Both are valid representations for the topic-level
  // visual requirement.
  const hasVisual = sequence.some((block) => block.type === 'visual' || Boolean(block.visual));
  const hasRequiredVisualIssue = issues.some((issue) => issue.path.endsWith('.visual') && issue.message.startsWith('Visuel requis'));
  if (visualTopic && !hasVisual && !hasRequiredVisualIssue) issues.push({ path: 'sequence', message: 'Ce concept bénéficie d’un visuel pédagogique déterministe.' });
  return issues;
}
