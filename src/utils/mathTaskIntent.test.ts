import { describe, expect, it } from 'vitest';
import { detectMathTaskIntent, isExplicitDivisionTask } from './mathTaskIntent';

describe('math task intent', () => {
  it.each([
    'Encadrer la fraction 7/3',
    'Donne l’encadrement de 7/3 entre deux entiers',
    'Quelles sont les bornes de la fraction 11/4 ?',
  ])('routes French fraction bounds to fraction work: %s', (prompt) => {
    expect(detectMathTaskIntent(prompt)).toBe('fraction_encadrement');
    expect(isExplicitDivisionTask(prompt)).toBe(false);
  });

  it.each([
    'Comparer les fractions 3/4 et 5/8',
    'Ranger 2/3 et 3/5 dans l’ordre croissant',
  ])('recognizes fraction comparison: %s', (prompt) => {
    expect(detectMathTaskIntent(prompt)).toBe('fraction_comparison');
  });

  it.each([
    'Simplifie la fraction 12/18',
    'Réduire 15/25 sous forme irréductible',
  ])('recognizes fraction simplification: %s', (prompt) => {
    expect(detectMathTaskIntent(prompt)).toBe('fraction_simplification');
  });

  it.each([
    '7 ÷ 3',
    'Calcule 7/3',
    'Effectue la division de 84 par 7',
    'Quel est le quotient de 22 par 4 ?',
  ])('routes genuine division to the division engine: %s', (prompt) => {
    expect(detectMathTaskIntent(prompt)).toBe('division');
    expect(isExplicitDivisionTask(prompt)).toBe(true);
  });

  it.each(['7/3', 'La fraction 7/3', 'Que vaut 7/3 ?'])('keeps ambiguous slash notation out of long division: %s', (prompt) => {
    expect(detectMathTaskIntent(prompt)).not.toBe('division');
    expect(isExplicitDivisionTask(prompt)).toBe(false);
  });
});
