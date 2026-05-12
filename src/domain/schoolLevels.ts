export const SCHOOL_LEVELS = [
  { code: "cp", labelFr: "CP", labelEn: "CP", order: 1 },
  { code: "ce1", labelFr: "CE1", labelEn: "CE1", order: 2 },
  { code: "ce2", labelFr: "CE2", labelEn: "CE2", order: 3 },
  { code: "cm1", labelFr: "CM1", labelEn: "CM1", order: 4 },
  { code: "cm2", labelFr: "CM2", labelEn: "CM2", order: 5 },
  { code: "6eme", labelFr: "6ème", labelEn: "6th grade", order: 6 },
  { code: "5eme", labelFr: "5ème", labelEn: "7th grade", order: 7 },
  { code: "4eme", labelFr: "4ème", labelEn: "8th grade", order: 8 },
  { code: "3eme", labelFr: "3ème", labelEn: "9th grade", order: 9 },
  { code: "2nde", labelFr: "Seconde", labelEn: "10th grade", order: 10 },
  { code: "1ere", labelFr: "Première", labelEn: "11th grade", order: 11 },
  { code: "terminale", labelFr: "Terminale", labelEn: "12th grade", order: 12 }
] as const;

export type SchoolLevelCode = (typeof SCHOOL_LEVELS)[number]['code'];

export function normalizeSchoolLevel(input: string | null | undefined): string | null {
  if (!input) return null;
  const normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[:_\s-]+/g, '')
    .replace(/ème/g, 'eme');

  if (normalized === '3e' || normalized === '3eme' || normalized === 'troisieme') return '3eme';
  if (normalized === '4e' || normalized === '4eme' || normalized === 'quatrieme') return '4eme';
  if (normalized === '5e' || normalized === '5eme' || normalized === 'cinquieme') return '5eme';
  if (normalized === '6e' || normalized === '6eme' || normalized === 'sixieme') return '6eme';
  if (normalized === 'term' || normalized === 'terminale') return 'terminale';
  if (normalized === '1ere' || normalized === 'premiere') return '1ere';
  if (normalized === '2nde' || normalized === 'seconde') return '2nde';

  const exactMatch = SCHOOL_LEVELS.find((l) => l.code === normalized);
  if (exactMatch) return exactMatch.code;

  return input.trim().toLowerCase().replace(/\s+/g, '_');
}

export function getSchoolLevelLabel(code: string | null | undefined, locale: string = 'fr'): string {
  const normalized = normalizeSchoolLevel(code);
  const option = SCHOOL_LEVELS.find((l) => l.code === normalized);
  if (!option) return code ?? '';
  return locale.startsWith('en') ? option.labelEn : option.labelFr;
}

export function getSchoolLevelOptions(locale: string = 'fr') {
  return SCHOOL_LEVELS.map((level) => ({
    value: level.code,
    label: locale.startsWith('en') ? level.labelEn : level.labelFr,
    order: level.order,
  }));
}

export function dedupeSchoolLevels<T extends Record<string, any>>(levels: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of levels) {
    const rawCode = item.code ?? item.level ?? item.level_code;
    const normalized = normalizeSchoolLevel(rawCode);
    if (!normalized) continue;
    
    if (!map.has(normalized)) {
      const canon = SCHOOL_LEVELS.find((l) => l.code === normalized);
      
      const copy = { ...item };
      if ('code' in copy) copy.code = normalized;
      if ('level' in copy) copy.level = normalized;
      if ('level_code' in copy) copy.level_code = normalized;
      if ('level_name' in copy) copy.level_name = canon ? getSchoolLevelLabel(normalized) : item.level_name;
      if ('order' in copy) copy.order = canon?.order ?? item.order ?? 999;
      if ('sort_order' in copy) copy.sort_order = canon?.order ?? item.sort_order ?? 999;
      
      // Keep a shadow order for sorting if it doesn't exist
      Object.defineProperty(copy, '__order', { value: canon?.order ?? item.sort_order ?? item.order ?? 999, enumerable: false });
      
      map.set(normalized, copy);
    }
  }
  return Array.from(map.values()).sort((a: any, b: any) => a.__order - b.__order);
}
