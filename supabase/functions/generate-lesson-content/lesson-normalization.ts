import { determineVisualRequirement, isSupportedVisualKind } from './visual-policy.ts';

type RecordValue = Record<string, unknown>;
const object = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export type NormalizationEvent = { path: string; from: string; to: string };

function fallbackVisual(block: RecordValue, topicName: string, candidate: RecordValue | null): RecordValue {
  const policy = determineVisualRequirement(block);
  const context = `${topicName} ${String(block.title ?? '')} ${String(block.content ?? '')}`;
  if (policy.suggestedKinds.includes('fraction_bar') || /fraction|numérateur|dénominateur/i.test(context)) {
    const match = context.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/);
    const sourceData = object(candidate?.data) ? candidate.data : {};
    const dataParts = Number(sourceData.parts ?? sourceData.denominator);
    const dataFilled = Number(sourceData.filled ?? sourceData.numerator);
    const denominator = match && Number(match[2]) >= 2 && Number(match[2]) <= 12 ? Number(match[2])
      : Number.isInteger(dataParts) && dataParts >= 2 && dataParts <= 12 ? dataParts : 4;
    const numerator = match && denominator === Number(match[2]) && Number(match[1]) <= denominator ? Number(match[1])
      : Number.isInteger(dataFilled) && dataFilled >= 0 && dataFilled <= denominator && dataParts === denominator ? dataFilled : 0;
    const example = numerator > 0 ? `Exemple : ${numerator}/${denominator}.` : `Un tout partagé en ${denominator} parts égales, sans part coloriée.`;
    return { kind: 'fraction_bar', purpose: example, alt_text: example,
      data: { parts: denominator, filled: numerator, denominator, numerator } };
  }
  if (policy.suggestedKinds.includes('number_line')) {
    return { kind: 'number_line', purpose: 'Montrer des graduations égales de 0 à 1.', alt_text: 'Droite graduée de 0 à 1.',
      data: { min: 0, max: 1, step: 0.25, ticks: [0, 0.25, 0.5, 0.75, 1] } };
  }
  // Geometry has a broad policy because several figure types are valid, but
  // `diagram` is not an acceptable fallback for a required geometry visual.
  // Select the most specific figure supported by the actual lesson text.
  const geometryKind = /angle/i.test(context) ? 'angle'
    : /symétr|symmetr/i.test(context) ? 'symmetry'
      : /coordonnée|coordonne|repère cartésien|repere cartesien/i.test(context) ? 'coordinate_plane'
        : /triangle/i.test(context) ? 'triangle'
          : /rectangle/i.test(context) ? 'rectangle'
            : /cercle|circle/i.test(context) ? 'circle'
              : /polygone|polygon/i.test(context) ? 'polygon'
                : /solide|geometric solid/i.test(context) ? 'geometric_solid'
                  : undefined;
  if (geometryKind && policy.suggestedKinds.includes(geometryKind)) {
    const label = String(block.title || block.content || topicName).trim().slice(0, 120);
    return { kind: geometryKind, purpose: `Représenter ${label.toLocaleLowerCase()}.`, alt_text: label,
      data: { label } };
  }
  // A generic diagram carries only labels already present in the lesson; it
  // does not invent a numeric assertion, geometry, or clock time.
  const label = String(block.title || block.content || topicName).trim().slice(0, 120);
  return { kind: 'diagram', purpose: 'Représenter la notion décrite.', alt_text: label,
    data: { items: [{ label }] } };
}

function normalizeVisual(block: RecordValue, topicName: string, path: string, events: NormalizationEvent[]): RecordValue {
  const candidate = object(block.visual) ? block.visual : null;
  const kind = candidate?.kind;
  const policy = determineVisualRequirement(block);
  const incompatible = block.type === 'concept' && policy.requirement === 'required' && !policy.suggestedKinds.includes(String(kind));
  if (candidate && isSupportedVisualKind(kind) && !incompatible) return block;
  const fallback = fallbackVisual(block, topicName, candidate);
  events.push({ path: `${path}.visual.kind`, from: nonempty(kind) ? kind : 'missing', to: String(fallback.kind) });
  return { ...block, visual: fallback };
}

function normalizeOptionalConceptFields(block: RecordValue): RecordValue {
  const result = { ...block };
  if (result.key_points !== undefined) {
    const points = Array.isArray(result.key_points) ? result.key_points.flatMap((point, index) => {
      if (nonempty(point) && !object(point)) return [{ label: `Point ${index + 1}`, text: point.trim() }];
      if (object(point) && nonempty(point.text)) return [{ label: nonempty(point.label) ? point.label.trim() : `Point ${index + 1}`, text: point.text.trim() }];
      return [];
    }).slice(0, 4) : [];
    if (points.length) result.key_points = points;
    else delete result.key_points;
  }
  if (result.takeaway !== undefined && !nonempty(result.takeaway)) delete result.takeaway;
  return result;
}

/** Pure, provider-free pass. Returns a new lesson and audit events without writing data. */
export function normalizeGeneratedLesson(lesson: RecordValue, topicName: string): { lesson: RecordValue; events: NormalizationEvent[] } {
  const events: NormalizationEvent[] = [];
  const sequence = Array.isArray(lesson.sequence) ? lesson.sequence.map((raw, index) => {
    if (!object(raw)) return raw;
    let block = raw.type === 'concept' ? normalizeOptionalConceptFields(raw) : { ...raw };
    const policy = determineVisualRequirement(block);
    if (block.type === 'visual' || block.visual !== undefined || (block.type === 'concept' && policy.requirement === 'required')) {
      block = normalizeVisual(block, topicName, `sequence[${index}]`, events);
    }
    return block;
  }) : lesson.sequence;
  const prerequisites = Array.isArray(lesson.prerequisites) ? lesson.prerequisites.map((raw, index) =>
    object(raw) && raw.visual !== undefined ? normalizeVisual(raw, topicName, `prerequisites[${index}]`, events) : raw) : lesson.prerequisites;
  return { lesson: { ...lesson, sequence, prerequisites }, events };
}

/** Ensure the canonical contract never sees a missing or unsupported visual kind. */
export function ensureRequiredVisuals(lesson: RecordValue, topicName: string): { lesson: RecordValue; events: NormalizationEvent[] } {
  return normalizeGeneratedLesson(lesson, topicName);
}
