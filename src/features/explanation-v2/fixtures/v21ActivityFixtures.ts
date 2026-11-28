/** Valid payload samples for all seven existing interactive kinds in the V2.1 path. */
export const v21ActivityFixtures: unknown[] = [
  { schemaVersion: 1, id: 'activity-fraction-select', kind: 'fraction-select', title: 'Sélectionner', prompt: 'Choisis les parts.', schoolLevel: 'CM2', target: { n: 3, d: 4 }, transfer: { n: 2, d: 3 } },
  { schemaVersion: 1, id: 'activity-fraction-bar', kind: 'fraction-bar', title: 'Additionner', prompt: 'Additionne les parts.', schoolLevel: 'CM2', left: { n: 3, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4, transfer: { left: { n: 1, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4 } },
  { schemaVersion: 1, id: 'activity-coordinate', kind: 'coordinate-plane', title: 'Placer', prompt: 'Place le point.', target: { x: 2, y: 3 }, transfer: { x: -1, y: 2 } },
  { schemaVersion: 1, id: 'activity-tiles', kind: 'algebra-tiles', title: 'Construire', prompt: 'Construis 2x + 3.', target: { x: 2, units: 3 }, transfer: { x: 1, units: 2 } },
  { schemaVersion: 1, id: 'activity-function', kind: 'linear-function', title: 'Fonction affine', prompt: 'Construis f(x) = 2x + 1.', schoolLevel: '3e', target: { m: 2, b: 1 }, transfer: { m: -1, b: 2 } },
  { schemaVersion: 1, id: 'activity-line-fit', kind: 'line-fit', title: 'Ajuster', prompt: 'Ajuste la droite.', points: [{ x: -2, y: -2 }, { x: -1, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 2 }] },
  { schemaVersion: 1, id: 'activity-equation', kind: 'equation-decomposition', title: 'Résoudre', prompt: 'Trouve x.', a: 3, b: 5, c: 20, transfer: { a: 2, b: 4, c: 18 } },
];
