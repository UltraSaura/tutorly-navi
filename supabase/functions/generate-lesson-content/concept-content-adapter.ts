import { semanticDuplicationDiagnostics } from './pedagogical-quality.ts';
import { isSupportedVisualKind } from './visual-policy.ts';
import type { ConceptSlot } from './lesson-blueprint.ts';

export type GeneratedConceptContent = {
  title: string;
  content: string;
  key_points?: Array<{ label: string; text: string }>;
  takeaway?: string;
  visual?: {
    kind: string;
    purpose: string;
    alt_text: string;
    data: unknown;
  };
};

export type ConceptAdapterError = { field: string; code: string; message: string };
export type ConceptAdapterResult = { ok: true; content: GeneratedConceptContent } | { ok: false; errors: ConceptAdapterError[] };

export type ConceptAdapterMetrics = {
  concept_slots_total: number;
  concept_slots_valid: number;
  concept_slots_rejected: number;
  concept_visual_required: number;
  concept_visual_optional: number;
  concept_validation_errors: number;
};

const structuralFields = new Set(['slotId', 'id', 'type', 'objectiveIds', 'objective_ids', 'visualRequirement', 'allowedVisualKinds', 'requiresKeyPoints', 'keyPointCount', 'requiresTakeaway', 'sequence', 'levelNumber', 'level_number', 'prerequisiteSlots', 'masterySlot']);
const placeholder = /^(?:todo|tbd|placeholder|lorem ipsum|n\/a|na)$/i;
const rawJson = /```|^[\[{]|(?:"(?:slotId|objectiveIds|visualRequirement|allowedVisualKinds)"\s*:)/i;

const error = (field: string, code: string, message: string): ConceptAdapterError => ({ field, code, message });
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const trimmed = (value: unknown): string => String(value).trim();
const positiveNumber = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value) && value > 0;

function textErrors(field: string, value: unknown): ConceptAdapterError[] {
  if (!nonEmpty(value)) return [error(field, 'required', 'Expected a non-empty string.')];
  const text = trimmed(value);
  if (placeholder.test(text)) return [error(field, 'placeholder', 'Placeholder content is not accepted.')];
  if (rawJson.test(text)) return [error(field, 'raw_json', 'Raw JSON/Markdown content is not accepted.')];
  if (/^(.)\1+$/.test(text)) return [error(field, 'trivial', 'Trivial repeated content is not accepted.')];
  return [];
}

function visualDataErrors(kind: string, data: unknown): ConceptAdapterError[] {
  const errors: ConceptAdapterError[] = [];
  if (!object(data) || Object.keys(data).length === 0) return [error('visual.data', 'malformed_visual_data', `Visual kind ${kind} requires non-empty semantic data.`)];
  const d = data as Record<string, unknown>;
  const relationScopeErrors = (): ConceptAdapterError[] => {
    if (!Array.isArray(d.relations)) return [];
    if (!Array.isArray(d.units) || d.units.length < 1) return [error('visual.data.relations', 'undeclared_relation_unit', 'Every visual relation requires a declared units array.')];
    const declared = new Set(d.units.map((unit) => typeof unit === 'string' ? unit.trim().toLocaleLowerCase('fr') : (object(unit) && typeof unit.id === 'string' ? unit.id.trim().toLocaleLowerCase('fr') : '')));
    const errors: ConceptAdapterError[] = [];
    d.relations.forEach((relation, index) => {
      if (!object(relation)) return errors.push(error(`visual.data.relations[${index}]`, 'invalid_relation', 'Each visual relation must be an object with from and to.'));
      for (const endpoint of ['from', 'to']) {
        const value = typeof relation[endpoint] === 'string' ? relation[endpoint].trim().toLocaleLowerCase('fr') : '';
        if (!declared.has(value)) errors.push(error(`visual.data.relations[${index}].${endpoint}`, 'undeclared_relation_unit', `Relation ${endpoint} must reference a unit declared in visual.data.units.`));
      }
    });
    return errors;
  };
  switch (kind) {
    case 'clock':
      if (!Number.isInteger(d.hour) || Number(d.hour) < 1 || Number(d.hour) > 12) errors.push(error('visual.data.hour', 'malformed_visual_data', 'Clock hour must be an integer from 1 to 12.'));
      if (!Number.isInteger(d.minute) || Number(d.minute) < 0 || Number(d.minute) > 59) errors.push(error('visual.data.minute', 'malformed_visual_data', 'Clock minute must be an integer from 0 to 59.'));
      break;
    case 'unit_conversion':
      if (Array.isArray(d.relations) || Array.isArray(d.units)) {
        if ((d.relations ?? d.units as unknown[]).length < 1) errors.push(error('visual.data', 'malformed_visual_data', 'Conversion relations/units cannot be empty.'));
      } else if (!(nonEmpty(d.from) && nonEmpty(d.to) && positiveNumber(d.factor))) {
        errors.push(error('visual.data', 'malformed_visual_data', 'Unit conversion needs from, to, and a positive factor, or non-empty relations/units.'));
      }
      errors.push(...relationScopeErrors());
      break;
    case 'timeline':
      if ((!Array.isArray(d.units) || d.units.length < 2) && (!Array.isArray(d.relations) || d.relations.length < 1)) errors.push(error('visual.data', 'malformed_visual_data', 'Timeline needs at least two units or one relation.'));
      errors.push(...relationScopeErrors());
      break;
    case 'fraction_bar':
    case 'fraction_circle':
      if (!Number.isInteger(d.parts) || Number(d.parts) < 2) errors.push(error('visual.data.parts', 'malformed_visual_data', 'Fraction visual needs at least two equal parts.'));
      if (!Number.isInteger(d.filled) || Number(d.filled) < 0 || Number(d.filled) > Number(d.parts)) errors.push(error('visual.data.filled', 'malformed_visual_data', 'Filled parts must be between zero and total parts.'));
      break;
    case 'number_line':
      if (typeof d.min !== 'number' || typeof d.max !== 'number' || d.max <= d.min) errors.push(error('visual.data', 'malformed_visual_data', 'Number line needs numeric min/max with max greater than min.'));
      break;
    case 'triangle':
    case 'polygon':
      if (!(Array.isArray(d.points) && d.points.length >= 3) && !(Number.isInteger(d.sides) && Number(d.sides) >= 3)) errors.push(error('visual.data', 'malformed_visual_data', `${kind} needs at least three points or sides.`));
      break;
    case 'rectangle':
      if (!(positiveNumber(d.width) && positiveNumber(d.height)) && !(Array.isArray(d.points) && d.points.length >= 4)) errors.push(error('visual.data', 'malformed_visual_data', 'Rectangle needs positive width/height or four points.'));
      break;
    case 'circle':
      if (!positiveNumber(d.radius)) errors.push(error('visual.data.radius', 'malformed_visual_data', 'Circle needs a positive radius.'));
      break;
    case 'angle':
      if (!(typeof d.degrees === 'number' && d.degrees > 0 && d.degrees <= 360) && !Array.isArray(d.rays)) errors.push(error('visual.data', 'malformed_visual_data', 'Angle needs degrees or rays.'));
      break;
    default:
      // Other supported visual families still require structured, non-empty
      // data. Their specialized semantic contracts can be extended without
      // changing this adapter boundary.
      break;
  }
  return errors;
}

function normalizeContent(raw: Record<string, unknown>): GeneratedConceptContent {
  const output: GeneratedConceptContent = { title: trimmed(raw.title), content: trimmed(raw.content) };
  if (Array.isArray(raw.key_points)) output.key_points = raw.key_points.map((point) => ({ label: trimmed((point as Record<string, unknown>).label), text: trimmed((point as Record<string, unknown>).text) }));
  if (raw.takeaway !== undefined) output.takeaway = trimmed(raw.takeaway);
  if (object(raw.visual)) output.visual = { kind: trimmed(raw.visual.kind), purpose: trimmed(raw.visual.purpose), alt_text: trimmed(raw.visual.alt_text), data: raw.visual.data };
  return output;
}

export function adaptConceptContent(slot: ConceptSlot, raw: unknown): ConceptAdapterResult {
  const errors: ConceptAdapterError[] = [];
  if (!object(raw)) return { ok: false, errors: [error('', 'invalid_input', 'Concept content must be an object.')] };
  Object.keys(raw).forEach((field) => { if (structuralFields.has(field)) errors.push(error(field, 'structural_field', 'Structural blueprint fields cannot be supplied by the content provider.')); });
  const content = normalizeContent(raw);
  errors.push(...textErrors('title', content.title), ...textErrors('content', content.content));
  if (raw.key_points !== undefined) {
    if (!Array.isArray(raw.key_points)) errors.push(error('key_points', 'invalid_type', 'key_points must be an array.'));
    else {
      if (raw.key_points.length < 1 || raw.key_points.length > 6) errors.push(error('key_points', 'bounds', 'key_points must contain 1–6 items.'));
      const signatures = new Set<string>();
      raw.key_points.forEach((point, index) => {
        if (!object(point)) return errors.push(error(`key_points[${index}]`, 'invalid_type', 'Each key point must be an object.'));
        errors.push(...textErrors(`key_points[${index}].label`, point.label), ...textErrors(`key_points[${index}].text`, point.text));
        const signature = `${trimmed(point.label).toLocaleLowerCase('fr')}|${trimmed(point.text).toLocaleLowerCase('fr')}`;
        if (signatures.has(signature)) errors.push(error(`key_points[${index}]`, 'duplicate', 'Key points must contain distinct information.'));
        signatures.add(signature);
      });
    }
  }
  if (slot.requiresKeyPoints) {
    const count = Array.isArray(content.key_points) ? content.key_points.length : 0;
    if (count < slot.keyPointCount.min || count > slot.keyPointCount.max) errors.push(error('key_points', 'required_bounds', `This slot requires ${slot.keyPointCount.min}–${slot.keyPointCount.max} key points.`));
  }
  if (slot.requiresTakeaway) errors.push(...textErrors('takeaway', content.takeaway));
  if (content.visual !== undefined) {
    const visual = content.visual;
    if (!isSupportedVisualKind(visual.kind)) errors.push(error('visual.kind', 'unsupported_visual_kind', `Unsupported visual kind: ${visual.kind}.`));
    if (!(slot.allowedVisualKinds ?? []).includes(visual.kind)) errors.push(error('visual.kind', 'visual_policy', `This slot allows only: ${(slot.allowedVisualKinds ?? []).join(', ')}.`));
    errors.push(...textErrors('visual.purpose', visual.purpose), ...textErrors('visual.alt_text', visual.alt_text), ...visualDataErrors(visual.kind, visual.data));
  } else if (slot.visualRequirement === 'required') {
    errors.push(error('visual', 'required_visual', `A visual is required; allowed kinds: ${(slot.allowedVisualKinds ?? []).join(', ')}.`));
  }
  for (const duplicate of semanticDuplicationDiagnostics(content as unknown as Record<string, unknown>)) {
    errors.push(error(duplicate.fieldB, 'semantic_duplication', duplicate.reason));
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, content };
}

export function conceptAdapterMetrics(results: ConceptAdapterResult[], slots: ConceptSlot[]): ConceptAdapterMetrics {
  return {
    concept_slots_total: results.length,
    concept_slots_valid: results.filter((result) => result.ok).length,
    concept_slots_rejected: results.filter((result) => !result.ok).length,
    concept_visual_required: slots.filter((slot) => slot.visualRequirement === 'required').length,
    concept_visual_optional: slots.filter((slot) => slot.visualRequirement !== 'required').length,
    concept_validation_errors: results.reduce((count, result) => count + (result.ok ? 0 : result.errors.length), 0),
  };
}
