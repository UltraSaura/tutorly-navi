import { assert, assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { determineVisualRequirement } from './visual-policy.ts';

Deno.test('staging 01a14510: perimeter + cm→m conversion concept accepts a rectangle', () => {
  const policy = determineVisualRequirement({ title: 'Périmètre et conversion', content: 'Le rectangle mesure 150 cm de long. Je convertis en mètres : 100 cm = 1 m.' });
  assertEquals(policy.requirement, 'required');
  assert(policy.suggestedKinds.includes('rectangle'));
  assert(policy.suggestedKinds.includes('unit_conversion'));
});

Deno.test('perimeter vocabulary alone requires a geometric figure', () => {
  const policy = determineVisualRequirement({ title: 'Calculer un périmètre', content: 'J’additionne la longueur de tous les côtés.' });
  assertEquals(policy.requirement, 'required');
  assert(policy.suggestedKinds.includes('rectangle'));
});

Deno.test('pure duration conversion still rejects geometric figures (check not loosened)', () => {
  const policy = determineVisualRequirement({ title: 'Convertir des durées', content: '1 heure = 60 minutes.' });
  assertEquals(policy.suggestedKinds, ['unit_conversion', 'timeline']);
  assert(!policy.suggestedKinds.includes('rectangle'));
});
