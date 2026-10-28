import { describe, expect, it } from 'vitest';
import { semanticDuplicationDiagnostics } from './pedagogical-quality.ts';
import { classifyGenerationFailure, stagingValidationFailure } from './staging-level-workflow.ts';

describe('structured concept composition context (provider-free)', () => {
  it('accepts legitimate shared decimal vocabulary', () => {
    const diagnostics = semanticDuplicationDiagnostics({
      content: 'Une fraction décimale représente une ou plusieurs parts de l’unité avec une écriture à virgule.',
      key_points: [
        { label: 'Écriture', text: 'La virgule sépare la partie entière et la partie décimale.' },
        { label: 'Valeur', text: 'Le dénominateur indique le partage de l’unité.' },
      ],
      takeaway: 'Astuce : pense à une règle graduée.',
    }, 'Les nombres décimaux');

    expect(diagnostics).toEqual([]);
  });

  it('rejects an explanation sentence copied exactly into a key point', () => {
    const diagnostics = semanticDuplicationDiagnostics({
      content: 'Une fraction décimale représente une part de l’unité.',
      key_points: [{ label: 'Définition', text: 'Une fraction décimale représente une part de l’unité.' }],
      takeaway: 'Astuce : pense à une règle graduée.',
    }, 'Les nombres décimaux');

    expect(diagnostics.some((item) => item.fieldB === 'key_points[0]')).toBe(true);
  });

  it('rejects quasi-identical key points after normalization', () => {
    const diagnostics = semanticDuplicationDiagnostics({
      content: 'Une fraction décimale représente une part de l’unité.',
      key_points: [
        { label: 'Valeur', text: 'La virgule sépare les parties.' },
        { label: 'Rappel', text: 'LA virgule sépare les parties !' },
      ],
      takeaway: 'Astuce : pense à une règle graduée.',
    }, 'Les nombres décimaux');

    expect(diagnostics.some((item) => item.fieldA === 'key_points[0]' && item.fieldB === 'key_points[1]')).toBe(true);
  });

  it('rejects a genuinely redundant geometric statement', () => {
    const diagnostics = semanticDuplicationDiagnostics({
      content: 'Le rectangle possède quatre angles droits et ses côtés opposés ont la même longueur.',
      key_points: [{ label: 'Propriété', text: 'Le rectangle possède quatre angles droits et ses côtés opposés ont la même longueur.' }],
      takeaway: 'Astuce : pense à une porte.',
    }, 'Les aires');

    expect(diagnostics.some((item) => item.fieldB === 'key_points[0]')).toBe(true);
  });

  it('classifies composition failures as structured 422 outcomes with actual provider calls', () => {
    const failure = stagingValidationFailure(1, [{ path: 'sequence[0].key_points', message: 'Composition redondante.' }], 0);
    expect(classifyGenerationFailure(new Error(failure.technicalDetail), failure.stage)).toMatchObject({
      status: 422,
      code: 'staging_level_validation_failed',
      stage: 'level_validation',
    });
    expect(failure.providerCalls).toBe(0);
    expect(stagingValidationFailure(1, [{ path: 'sequence[0].key_points', message: 'Composition redondante.' }], 1).providerCalls).toBe(1);
  });
});
