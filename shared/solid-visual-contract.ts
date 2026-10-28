export const SOLID_TYPES = [
  'cube',
  'rectangular_prism',
  'sphere',
  'cone',
  'cylinder',
  'pyramid',
  'prism',
] as const;

export const SOLID_BASES = ['triangle', 'square', 'rectangle', 'pentagon'] as const;

export type SolidType = typeof SOLID_TYPES[number];
export type SolidBase = typeof SOLID_BASES[number];

export type SolidDimensions = {
  edge?: number;
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
};

export type SolidVisualData = {
  solidType: SolidType;
  base?: SolidBase;
  dimensions: SolidDimensions;
  hiddenEdges?: boolean;
};

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isFinitePositive = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value > 0
);

const received = (value: unknown): string => {
  if (value === undefined) return '<missing>';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value);
  try { return JSON.stringify(value); } catch { return '<unserializable>'; }
};

export type SolidContractIssue = { path: string; code: string; message: string };

export function solidVisualDataErrors(value: unknown, basePath = 'visual.data'): SolidContractIssue[] {
  if (!isRecord(value)) return [{ path: basePath, code: 'missing_solid_data', message: 'Un solide exige un objet de données complet.' }];
  const errors: SolidContractIssue[] = [];
  const solidType = value.solidType;
  if (typeof solidType !== 'string' || !(SOLID_TYPES as readonly string[]).includes(solidType)) {
    errors.push({ path: `${basePath}.solidType`, code: 'invalid_solid_type', message: `Type de solide inconnu: reçu ${received(solidType)}.` });
    return errors;
  }

  const dimensions = value.dimensions;
  if (!isRecord(dimensions)) {
    errors.push({ path: `${basePath}.dimensions`, code: 'missing_solid_dimensions', message: 'Les dimensions positives du solide sont obligatoires.' });
  }

  const requiredDimension = (key: keyof SolidDimensions) => {
    if (!isRecord(dimensions) || !isFinitePositive(dimensions[key])) {
      errors.push({ path: `${basePath}.dimensions.${key}`, code: 'invalid_solid_dimension', message: `La dimension ${key} doit être un nombre positif; reçu ${received(isRecord(dimensions) ? dimensions[key] : undefined)}.` });
    }
  };

  if (solidType === 'cube') requiredDimension('edge');
  if (solidType === 'rectangular_prism' || solidType === 'prism' || solidType === 'pyramid') {
    requiredDimension('width');
    requiredDimension('height');
    requiredDimension('depth');
  }
  if (solidType === 'sphere' || solidType === 'cone' || solidType === 'cylinder') requiredDimension('radius');
  if (solidType === 'cone' || solidType === 'cylinder') requiredDimension('height');

  if (solidType === 'pyramid' || solidType === 'prism') {
    if (typeof value.base !== 'string' || !(SOLID_BASES as readonly string[]).includes(value.base)) {
      errors.push({ path: `${basePath}.base`, code: 'missing_solid_base', message: `La base ${solidType} doit être précisée parmi: ${SOLID_BASES.join(', ')}.` });
    }
  }
  return errors;
}

export const SOLID_PROMPT_RULE = [
  'Pour geometric_solid, data doit être {solidType, dimensions, base?}.',
  `solidType doit être exactement l’un de: ${SOLID_TYPES.join(', ')}.`,
  'cube exige dimensions.edge; rectangular_prism exige dimensions.width, dimensions.height et dimensions.depth.',
  'sphere exige dimensions.radius; cone et cylinder exigent dimensions.radius et dimensions.height.',
  `pyramid et prism exigent aussi base parmi: ${SOLID_BASES.join(', ')} et dimensions.width, dimensions.height, dimensions.depth.`,
  'Un type inconnu ou une donnée incomplète doit être refusé, jamais remplacé par un autre solide.',
].join(' ');

export const SOLID_GALLERY_FIXTURES: Record<SolidType, SolidVisualData> = {
  cube: { solidType: 'cube', dimensions: { edge: 4 } },
  rectangular_prism: { solidType: 'rectangular_prism', dimensions: { width: 6, height: 3, depth: 4 } },
  sphere: { solidType: 'sphere', dimensions: { radius: 3 } },
  cone: { solidType: 'cone', dimensions: { radius: 3, height: 5 } },
  cylinder: { solidType: 'cylinder', dimensions: { radius: 3, height: 5 } },
  pyramid: { solidType: 'pyramid', base: 'square', dimensions: { width: 4, height: 5, depth: 4 } },
  prism: { solidType: 'prism', base: 'triangle', dimensions: { width: 4, height: 4, depth: 6 } },
};
