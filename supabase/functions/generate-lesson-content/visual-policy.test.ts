import { describe, expect, it } from 'vitest';
import { determineVisualRequirement } from './visual-policy.ts';

it('staging 01a14510: perimeter + cm→m conversion concept accepts a rectangle', () => {
  const policy = determineVisualRequirement({ title: 'Périmètre et conversion', content: 'Le rectangle mesure 150 cm de long. Je convertis en mètres : 100 cm = 1 m.' });
  expect(policy.requirement).toBe('required');
  expect(policy.suggestedKinds.includes('rectangle')).toBe(true);
  expect(policy.suggestedKinds.includes('unit_conversion')).toBe(true);
});

it('perimeter vocabulary alone requires a geometric figure', () => {
  const policy = determineVisualRequirement({ title: 'Calculer un périmètre', content: 'J’additionne la longueur de tous les côtés.' });
  expect(policy.requirement).toBe('required');
  expect(policy.suggestedKinds.includes('rectangle')).toBe(true);
});

it('pure duration conversion still rejects geometric figures (check not loosened)', () => {
  const policy = determineVisualRequirement({ title: 'Convertir des durées', content: '1 heure = 60 minutes.' });
  expect(policy.suggestedKinds).toEqual(['unit_conversion', 'timeline']);
  expect(policy.suggestedKinds.includes('rectangle')).toBe(false);
});
